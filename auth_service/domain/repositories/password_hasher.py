from abc import ABC, abstractmethod


class PasswordHasher(ABC):

    @abstractmethod
    def hash_password(self, password: str) -> str:
        pass

    @abstractmethod
    def verify_password(self, plain, hashed) -> bool:
        pass
