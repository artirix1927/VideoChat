# infrastructure/mappers.py
from domain.models import User, RefreshToken
from infrastructure.models import User as UserModel, RefreshToken as RefreshTokenModel


def user_from_model(user_model: UserModel) -> User:
    return User(
        id=user_model.id,
        username=user_model.username,
        hashed_password=user_model.hashed_password,
        email=user_model.email,
    )


def refresh_token_from_model(rt_model: RefreshTokenModel) -> RefreshToken:
    return RefreshToken(
        id=rt_model.id,
        user_id=rt_model.user_id,
        token=rt_model.token,
        expires_at=rt_model.expires_at,
        revoked=rt_model.revoked,
    )
