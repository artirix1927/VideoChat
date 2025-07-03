from datetime import datetime
from dataclasses import dataclass


@dataclass
class User:
    id: int
    username: str
    email: str
    hashed_password: str

    @staticmethod
    def create_user(username: str, hashed_password: str, email: str) -> "User":
        return User(
            id=None, username=username, hashed_password=hashed_password, email=email
        )


@dataclass
class RefreshToken:
    id: int
    user_id: int
    token: str
    expires_at: datetime
    revoked: bool


@dataclass
class TwoFactorCode:
    id: int
    user_id: int
    code: str
    expires_at: datetime
