from abc import ABC, abstractmethod
from domain.models import User


class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: str) -> User:
        pass

    @abstractmethod
    def get_by_username(self, username: str) -> User:
        pass

    @abstractmethod
    def save(self, user: User):
        pass

    @abstractmethod
    def create_user(self, username: str, password: str) -> User:
        pass
