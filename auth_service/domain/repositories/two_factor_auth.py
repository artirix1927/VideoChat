from abc import ABC, abstractmethod
from datetime import datetime

from domain.models import User


class TwoFactorCodeSender(ABC):
    @abstractmethod
    async def send_code(self, user: User, code: str):
        pass


class TwoFactorCodeRepository(ABC):
    @abstractmethod
    async def save(self, user_id: int, code: str, expires_at: datetime):
        pass

    @abstractmethod
    async def verify(self, user_id: int, code: str) -> bool:
        pass
