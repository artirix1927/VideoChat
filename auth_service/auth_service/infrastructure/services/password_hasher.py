from passlib.context import CryptContext

from auth_service.domain.repositories.password_hasher import PasswordHasher


class BcryptPasswordHasher(PasswordHasher):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(self, password: str):
        return self.pwd_context.hash(password)

    def verify_password(self, plain, hashed):
        return self.pwd_context.verify(plain, hashed)
