from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class TokenGenerator(ABC):

    @abstractmethod
    def generate_access_token(self, user) -> str:
        pass

    @abstractmethod
    def generate_refresh_token(self) -> str:
        pass

    @abstractmethod
    def decode_payload(self, token: str) -> dict[str, Any]:
        pass

    @abstractmethod
    def extract_from_payload(self, token: str) -> tuple[str, datetime]:
        pass
