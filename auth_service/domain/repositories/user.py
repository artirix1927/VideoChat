from abc import ABC, abstractmethod
from domain.models import User


class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: str) -> User:
        pass

    @abstractmethod
    async def get_by_username(self, username: str) -> User:
        pass

    @abstractmethod
    async def save(self, user: User):
        pass

    @abstractmethod
    async def create_user(self, username: str, password: str) -> User:
        pass
