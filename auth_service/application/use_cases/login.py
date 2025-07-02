from domain.repositories.refresh_token import RefreshTokenRepository
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.token_generator import TokenGenerator
from domain.repositories.user import UserRepository
from fastapi import HTTPException


class LoginUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
        refresh_token_repository: RefreshTokenRepository,
        token_generator: TokenGenerator,
        password_hasher: PasswordHasher,
    ):
        self.user_repository = user_repository
        self.token_generator = token_generator
        self.password_hasher = password_hasher
        self.refresh_token_repository = refresh_token_repository

    async def execute(self, username: str, password: str):
        user = await self.user_repository.get_by_username(username)

        is_password_verified = self.password_hasher.verify_password(
            password, user.hashed_password
        )

        if not user or not is_password_verified:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = self.token_generator.generate_access_token(user)
        refresh_token = self.token_generator.generate_refresh_token(user)

        refresh_token_user_id, refresh_token_exp = (
            self.token_generator.extract_from_payload(refresh_token)
        )

        await self.refresh_token_repository.create_or_update_refresh_token(
            refresh_token, refresh_token_user_id, refresh_token_exp
        )
        return {"access_token": access_token, "refresh_token": refresh_token}
