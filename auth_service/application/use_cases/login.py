from domain.repositories.refresh_token import RefreshTokenRepository
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.token_generator import TokenGenerator
from domain.repositories.user import UserRepository
from fastapi import HTTPException


from domain.repositories.two_factor_auth import (
    TwoFactorCodeSender,
    TwoFactorCodeRepository,
)
import random
from datetime import datetime, timedelta, timezone


class LoginUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        refresh_token_repository: RefreshTokenRepository,
        token_generator: TokenGenerator,
        password_hasher: PasswordHasher,
        code_sender: TwoFactorCodeSender,
        code_repository: TwoFactorCodeRepository,
    ):
        self.user_repository = user_repository
        self.token_generator = token_generator
        self.password_hasher = password_hasher
        self.refresh_token_repository = refresh_token_repository
        self.code_sender = code_sender
        self.code_repository = code_repository

    async def execute(self, username: str, password: str):
        user = await self.user_repository.get_by_username(username)

        if not user or not self.password_hasher.verify_password(
            password, user.hashed_password
        ):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate and send 2FA code
        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        await self.code_repository.save(user.id, code, expires_at)
        await self.code_sender.send_code(user, code)

        return {"message": "2FA code sent", "user_id": user.id}
