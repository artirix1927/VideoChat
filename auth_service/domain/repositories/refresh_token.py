from abc import ABC, abstractmethod

from auth_service.domain.models import RefreshToken


class RefreshTokenRepository(ABC):

    @abstractmethod
    async def create_or_update_refresh_token(
        self, token_str: RefreshToken
    ) -> RefreshToken:
        pass
