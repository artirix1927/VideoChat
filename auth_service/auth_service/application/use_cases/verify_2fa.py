from calendar import month
from datetime import datetime, timedelta, timezone
from auth_service.domain.exceptions import Invalid2FACode, UserNotFound
from auth_service.domain.repositories.user import UserRepository
from auth_service.domain.repositories.token_generator import TokenGenerator
from auth_service.domain.repositories.two_factor_auth import TwoFactorCodeRepository
from auth_service.domain.repositories.refresh_token import RefreshTokenRepository


class Verify2FAUseCase:
    def __init__(
        self,
        user_repo: UserRepository,
        refresh_token_repo: RefreshTokenRepository,
        token_generator: TokenGenerator,
        code_repo: TwoFactorCodeRepository,
    ):
        self.user_repo = user_repo
        self.refresh_token_repo = refresh_token_repo
        self.token_generator = token_generator
        self.code_repo = code_repo

    async def execute(self, user_id: int, code: str):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFound()

        if not await self.code_repo.verify(user_id, code):
            raise Invalid2FACode()

        access_token = self.token_generator.generate_access_token(user)
        refresh_token = self.token_generator.generate_refresh_token()
        refresh_token_exp = datetime.now(timezone.utc) + timedelta(days=30)
        await self.refresh_token_repo.create_or_update_refresh_token(
            refresh_token, user_id, refresh_token_exp
        )

        return access_token, refresh_token
