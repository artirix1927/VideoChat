from fastapi import APIRouter, Depends, Request


from domain.repositories.refresh_token import RefreshTokenRepository
from infrastructure.repositories.sqlalchemy_refresh_token import (
    SQLAlchemyRefreshTokenRepository,
)
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.token_generator import TokenGenerator
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


router = APIRouter()


@router.post("/user/create")
async def create_user(
    request: Request, username: str, password: str, session: Session = Depends(get_db)
):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    password_hasher: PasswordHasher = BcryptPasswordHasher()

    register_use_case = RegisterUseCase(
        user_repository=user_repository,
        password_hasher=password_hasher,
    )

    try:
        result = await register_use_case.execute(request, username, password)
        return result
    except Exception as e:
        raise e


@router.post("/user/login")
async def login_user(username: str, password: str, session: Session = Depends(get_db)):
    user_repository: UserRepository = SQLAlchemyUserRepository(session)
    refresh_token_repository: RefreshTokenRepository = SQLAlchemyRefreshTokenRepository(
        session
    )
    token_generator: TokenGenerator = JWTTokenGenerator()
    password_hasher: PasswordHasher = BcryptPasswordHasher()

    login_use_case = LoginUseCase(
        user_repository=user_repository,
        token_generator=token_generator,
        password_hasher=password_hasher,
        refresh_token_repository=refresh_token_repository,
    )

    try:
        result = await login_use_case.execute(username, password)
        return result
    except Exception as e:
        raise e
