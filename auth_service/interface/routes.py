from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse


from auth_service.application.use_cases.delete import DeleteUseCase
from auth_service.application.use_cases.get_user import GetUserUseCase
from auth_service.application.use_cases.verify_refresh_token import (
    VerifyRefreshTokenUseCase,
)
from auth_service.domain.repositories import token_generator
from auth_service.domain.repositories.refresh_token import RefreshTokenRepository
from auth_service.domain.repositories.token_generator import TokenGenerator
from auth_service.infrastructure.repositories.sqlalchemy_2fa_code import (
    SQLAlchemyTwoFactorCodeRepository,
)
from auth_service.infrastructure.services import jwt_token_generator
from auth_service.infrastructure.services.email_sender import EmailTwoFactorSender
from auth_service.infrastructure.messaging.publishers.user_events import (
    UserEventPublisher,
)
from auth_service.infrastructure.repositories.sqlalchemy_refresh_token import (
    SQLAlchemyRefreshTokenRepository,
)
from auth_service.domain.repositories.password_hasher import PasswordHasher
from auth_service.domain.repositories.user import UserRepository
from auth_service.infrastructure.db_session import get_db
from sqlalchemy.orm import Session

from auth_service.infrastructure.repositories.sqlalchemy_user import (
    SQLAlchemyUserRepository,
)
from auth_service.infrastructure.services.jwt_token_generator import JWTTokenGenerator
from auth_service.infrastructure.services.password_hasher import BcryptPasswordHasher


from auth_service.application.use_cases.login import LoginUseCase
from auth_service.application.use_cases.register import RegisterUseCase


from pydantic import BaseModel


class RegisterUser(BaseModel):
    username: str
    password: str
    email: str


class LoginUser(BaseModel):
    username: str
    password: str


class VerifyUser(BaseModel):
    user_id: int
    code: str


class GetUser(BaseModel):
    access_token: str


router = APIRouter()


@router.post("/user/create")
async def create_user(
    request: Request,
    body: RegisterUser,  # 👈 this is now the body
    session: Session = Depends(get_db),
):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    password_hasher: PasswordHasher = BcryptPasswordHasher()
    publisher: UserEventPublisher = request.app.state.publisher  # ✅ move this here

    print(body.username, body.password, body.email)

    register_use_case = RegisterUseCase(
        publisher=publisher,
        user_repository=user_repository,
        password_hasher=password_hasher,
    )

    try:
        result = await register_use_case.execute(
            body.username, body.password, body.email
        )
        return result
    except Exception as e:
        raise e


@router.post("/user/login")
async def login_user(
    request: Request, body: LoginUser, session: Session = Depends(get_db)
):
    user_repository = SQLAlchemyUserRepository(session)
    refresh_token_repository = SQLAlchemyRefreshTokenRepository(session)
    token_generator = JWTTokenGenerator()
    password_hasher = BcryptPasswordHasher()
    user_event_publisher: UserEventPublisher = request.app.state.publisher
    code_repo = SQLAlchemyTwoFactorCodeRepository(session)

    login_use_case = LoginUseCase(
        user_repository=user_repository,
        token_generator=token_generator,
        password_hasher=password_hasher,
        refresh_token_repository=refresh_token_repository,
        user_publisher=user_event_publisher,
        code_repository=code_repo,
    )

    return await login_use_case.execute(body.username, body.password)


@router.post("/user/verify-2fa")
async def verify_2fa(body: VerifyUser, session: Session = Depends(get_db)):
    user_repository = SQLAlchemyUserRepository(session)
    refresh_token_repo = SQLAlchemyRefreshTokenRepository(session)
    token_generator = JWTTokenGenerator()
    code_repo = SQLAlchemyTwoFactorCodeRepository(session)

    user = await user_repository.get_by_id(body.user_id)
    if not user or not code_repo.verify(body.user_id, body.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    access_token = token_generator.generate_access_token(user)
    refresh_token = token_generator.generate_refresh_token(user)
    uid, exp = token_generator.extract_from_payload(refresh_token)

    await refresh_token_repo.create_or_update_refresh_token(refresh_token, uid, exp)

    response = JSONResponse(content={"access_token": access_token})

    # ✅ Set cookies
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",  # or "lax" depending on your frontend
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="strict",  # or "lax" depending on your frontend
        max_age=60 * 15,  # 5 min
    )

    return response


@router.post("/user/delete")
async def delete_user(user_id: int, session: Session = Depends(get_db)):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    delete_use_case = DeleteUseCase(user_repository=user_repository, id=user_id)
    try:
        result = await delete_use_case.execute(user_id=user_id)
        return result
    except Exception as e:
        raise e


@router.get("/user/")
async def get_user_by_access_token(
    request: Request, session: Session = Depends(get_db)
):
    access_token = request.cookies.get("access_token")

    if not access_token:
        raise HTTPException(status_code=401, detail="Access token missing")

    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    jwt_token_generator: TokenGenerator = JWTTokenGenerator()
    get_user_use_case = GetUserUseCase(
        user_repository=user_repository, token_generator=jwt_token_generator
    )

    try:
        result = await get_user_use_case.execute(access_token)
        return result
    except Exception as e:
        raise e


@router.get("/user/verify-referesh-token/")
async def verify_refresh_token(request: Request, session: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    refresh_token_repo: RefreshTokenRepository = SQLAlchemyRefreshTokenRepository(
        session
    )

    user_repo: UserRepository = SQLAlchemyUserRepository(session)
    jwt_token_generator: TokenGenerator = JWTTokenGenerator()

    verify_refresh_token_use_case = VerifyRefreshTokenUseCase(
        refresh_token_repository=refresh_token_repo,
        user_repository=user_repo,
        token_generator=jwt_token_generator,
    )
    try:
        response = JSONResponse(content={})
        access_token = await verify_refresh_token_use_case.execute(refresh_token)

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="strict",  # or "lax" depending on your frontend
            max_age=60 * 15,  # 5 min
        )

        return response
    except Exception as e:
        raise e
