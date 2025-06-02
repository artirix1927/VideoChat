from abc import ABC, abstractmethod

from domain.models import RefreshToken


class RefreshTokenRepository(ABC):

    @abstractmethod
    def create_or_update_refresh_token(self, token_str: RefreshToken) -> RefreshToken:
        pass
