from datetime import datetime
from dataclasses import dataclass


@dataclass
class User:
    id: int
    username: str
    email: str
    hashed_password: str

    @staticmethod
    def create_user(username: str, hashed_password: str) -> "User":
        return User(id=None, username=username, hashed_password=hashed_password)


@dataclass
class RefreshToken:
    id: int
    user_id: int
    token: str
    expires_at: datetime
    revoked: bool
