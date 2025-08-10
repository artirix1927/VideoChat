from datetime import datetime

from domain.exceptions import RefreshTokenExpired
from domain.models import RefreshToken
from domain.repositories.refresh_token import RefreshTokenRepository
from domain.repositories.token_generator import TokenGenerator
from domain.repositories.user import UserRepository


class VerifyRefreshTokenUseCase:
    def __init__(
        self,
        refresh_token_repository: RefreshTokenRepository,
        user_repository: UserRepository,
        token_generator: TokenGenerator,
    ):
        self.refresh_token_repository = refresh_token_repository
        self.user_repository = user_repository
        self.token_generator = token_generator

    async def execute(self, token: str) -> str | None:
        token: RefreshToken = (
            await self.refresh_token_repository.get_refresh_token_by_token_str(token)
        )
        if not token:
            return None

        now = datetime.now()
        if token.expires_at < now:
            raise RefreshTokenExpired()

        user = await self.user_repository.get_by_id(token.user_id)

        access_token = self.token_generator.generate_access_token(user)

        return access_token
