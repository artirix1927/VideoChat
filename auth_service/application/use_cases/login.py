from auth_service.domain.exceptions import InvalidCredentials
from auth_service.infrastructure.messaging.publishers.user_events import (
    UserEventPublisher,
)
from auth_service.domain.repositories.refresh_token import RefreshTokenRepository
from auth_service.domain.repositories.password_hasher import PasswordHasher
from auth_service.domain.repositories.token_generator import TokenGenerator
from auth_service.domain.repositories.user import UserRepository


from auth_service.domain.repositories.two_factor_auth import (
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
        user_publisher: UserEventPublisher,
        code_repository: TwoFactorCodeRepository,
    ):
        self.user_repository = user_repository
        self.token_generator = token_generator
        self.password_hasher = password_hasher
        self.refresh_token_repository = refresh_token_repository
        self.user_publisher = user_publisher
        self.code_repository = code_repository

    async def execute(self, username: str, password: str):
        user = await self.user_repository.get_by_username(username)

        if not user or not self.password_hasher.verify_password(
            password, user.hashed_password
        ):
            raise InvalidCredentials()

        # Generate and send 2FA code
        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        code_entity = await self.code_repository.save(user.id, code, expires_at)
        await self.user_publisher.publish_two_factor_code_generated(code_entity)
        return {"message": "2FA code sent", "user_id": user.id}
