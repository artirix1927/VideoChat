from abc import ABC, abstractmethod
from auth_service.domain.models import User


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
    async def create_user(self, username: str, password: str, email: str) -> User:
        pass

    @abstractmethod
    async def delete_by_id(id: int):
        pass

    @abstractmethod
    async def delete(user: User):
        pass

    @abstractmethod
    async def get_by_ids(user_ids: list[int]) -> list[User]:
        pass
