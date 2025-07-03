from fastapi import APIRouter, Depends, HTTPException, Request


from application.use_cases.delete import DeleteUseCase
from infrastructure.repositories.sqlalchemy_2fa_code import (
    SQLAlchemyTwoFactorCodeRepository,
)
from infrastructure.services.email_sender import EmailTwoFactorSender
from infrastructure.messaging.publishers.user_events import (
    UserEventPublisher,
)
from infrastructure.repositories.sqlalchemy_refresh_token import (
    SQLAlchemyRefreshTokenRepository,
)
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.user import UserRepository
from infrastructure.db_session import get_db
from sqlalchemy.orm import Session

from infrastructure.repositories.sqlalchemy_user import (
    SQLAlchemyUserRepository,
)
from infrastructure.services.jwt_token_generator import JWTTokenGenerator
from infrastructure.services.password_hasher import BcryptPasswordHasher


from application.use_cases.login import LoginUseCase
from application.use_cases.register import RegisterUseCase


from pydantic import BaseModel


class RegisterUser(BaseModel):
    username: str
    password: str
    email: str


class LoginUser(BaseModel):
    username: str
    password: str


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
async def login_user(body: LoginUser, session: Session = Depends(get_db)):
    user_repository = SQLAlchemyUserRepository(session)
    refresh_token_repository = SQLAlchemyRefreshTokenRepository(session)
    token_generator = JWTTokenGenerator()
    password_hasher = BcryptPasswordHasher()
    code_sender = EmailTwoFactorSender()
    code_repo = SQLAlchemyTwoFactorCodeRepository(session)

    login_use_case = LoginUseCase(
        user_repository=user_repository,
        token_generator=token_generator,
        password_hasher=password_hasher,
        refresh_token_repository=refresh_token_repository,
        code_sender=code_sender,
        code_repository=code_repo,
    )

    return await login_use_case.execute(body.username, body.password)


@router.post("/user/verify-2fa")
async def verify_2fa(user_id: int, code: str, session: Session = Depends(get_db)):
    user_repository = SQLAlchemyUserRepository(session)
    refresh_token_repo = SQLAlchemyRefreshTokenRepository(session)
    token_generator = JWTTokenGenerator()
    code_repo = SQLAlchemyTwoFactorCodeRepository(session)

    user = await user_repository.get_by_id(user_id)
    if not user or not code_repo.verify(user_id, code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    access_token = token_generator.generate_access_token(user)
    refresh_token = token_generator.generate_refresh_token(user)
    uid, exp = token_generator.extract_from_payload(refresh_token)

    await refresh_token_repo.create_or_update_refresh_token(refresh_token, uid, exp)

    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/user/delete")
async def delete_user(user_id: int, session: Session = Depends(get_db)):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    delete_use_case = DeleteUseCase(user_repository=user_repository, id=user_id)
    try:
        result = await delete_use_case.execute(user_id=user_id)
        return result
    except Exception as e:
        raise e
