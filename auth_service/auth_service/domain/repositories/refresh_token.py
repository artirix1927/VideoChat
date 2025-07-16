from abc import ABC, abstractmethod

from auth_service.domain.models import RefreshToken


class RefreshTokenRepository(ABC):

    @abstractmethod
    async def create_or_update_refresh_token(self, token: RefreshToken) -> RefreshToken:
        pass

    # @abstractmethod
    # async def exists(self, token_str: str) -> bool:
    #     pass

    @abstractmethod
    async def get_refresh_token_by_token_str(self, token_str: str) -> RefreshToken:
        pass
