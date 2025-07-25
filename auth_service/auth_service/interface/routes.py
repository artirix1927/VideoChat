from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse


from auth_service.application.use_cases.delete import DeleteUseCase
from auth_service.application.use_cases.get_user import GetUserUseCase
from auth_service.application.use_cases.verify_2fa import Verify2FAUseCase
from auth_service.application.use_cases.verify_refresh_token import (
    VerifyRefreshTokenUseCase,
)
from auth_service.domain.exceptions import (
    Invalid2FACode,
    InvalidCredentials,
    RefreshTokenExpired,
    UserNotFound,
)

from auth_service.domain.repositories.refresh_token import RefreshTokenRepository
from auth_service.domain.repositories.token_generator import TokenGenerator
from auth_service.infrastructure.repositories.sqlalchemy_2fa_code import (
    SQLAlchemyTwoFactorCodeRepository,
)

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

import auth_service.interface.dto as dto_models

router = APIRouter()


@router.post("/user/create")
async def create_user(
    request: Request,
    body: dto_models.RegisterUser,
    session: Session = Depends(get_db),
):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    password_hasher: PasswordHasher = BcryptPasswordHasher()
    publisher: UserEventPublisher = request.app.state.publisher  # ✅ move this here

    register_use_case = RegisterUseCase(
        publisher=publisher,
        user_repository=user_repository,
        password_hasher=password_hasher,
    )

    result = await register_use_case.execute(body.username, body.password, body.email)
    return result


@router.post("/user/login")
async def login_user(
    request: Request, body: dto_models.LoginUser, session: Session = Depends(get_db)
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

    try:
        return await login_use_case.execute(body.username, body.password)
    except InvalidCredentials:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/user/verify-2fa")
async def verify_2fa(body: dto_models.VerifyUser, session: Session = Depends(get_db)):
    use_case = Verify2FAUseCase(
        user_repo=SQLAlchemyUserRepository(session),
        refresh_token_repo=SQLAlchemyRefreshTokenRepository(session),
        token_generator=JWTTokenGenerator(),
        code_repo=SQLAlchemyTwoFactorCodeRepository(session),
    )

    try:
        access_token, refresh_token = await use_case.execute(body.user_id, body.code)

        response = JSONResponse(content={"access_token": access_token})

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,  # False for HTTP
            samesite="lax",  # Works with HTTP
            max_age=60 * 60 * 24 * 7,
            domain="localhost",  # If frontend/backend are on different ports
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # False for HTTP
            samesite="lax",  # Works with HTTP
            max_age=60 * 15,
            domain="localhost",  # If frontend/backend are on different ports
        )

        return response

    except UserNotFound:
        raise HTTPException(status_code=401, detail="User not found")
    except Invalid2FACode:
        HTTPException(status_code=401, detail="Invalid 2FA code")

    return


@router.post("/user/delete")
async def delete_user(user_id: int, session: Session = Depends(get_db)):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    delete_use_case = DeleteUseCase(user_repository=user_repository, id=user_id)

    result = await delete_use_case.execute(user_id=user_id)
    return result


@router.get("/user/")
async def get_user_by_access_token(
    request: Request, session: Session = Depends(get_db)
):
    access_token = request.cookies.get("access_token")
    print(request.cookies)
    if not access_token:
        raise HTTPException(status_code=401, detail="Access token missing")

    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    jwt_token_generator: TokenGenerator = JWTTokenGenerator()
    get_user_use_case = GetUserUseCase(
        user_repository=user_repository, token_generator=jwt_token_generator
    )

    result = await get_user_use_case.execute(access_token)
    return result


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

    response = JSONResponse(content={})
    try:
        access_token = await verify_refresh_token_use_case.execute(refresh_token)

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # False for HTTP
            samesite="lax",  # Works with HTTP
            max_age=60 * 15,
            domain="localhost",  # If frontend/backend are on different ports
        )
    except RefreshTokenExpired:
        raise HTTPException(status_code=401, detail="Refresh token is expired")

    return response
