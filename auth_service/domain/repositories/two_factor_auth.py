from abc import ABC, abstractmethod
from datetime import datetime

from domain.models import User


class TwoFactorCodeSender(ABC):
    @abstractmethod
    def send_code(self, user: User, code: str):
        pass


class TwoFactorCodeRepository(ABC):
    @abstractmethod
    def save_code(self, user_id: int, code: str, expires_at: datetime):
        pass

    @abstractmethod
    def verify_code(self, user_id: int, code: str) -> bool:
        pass
