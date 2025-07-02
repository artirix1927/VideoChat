from fastapi import Request
from infrastructure.messaging.publishers.user_events import UserEventPublisher
from infrastructure.repositories.sqlalchemy_user import SQLAlchemyUserRepository
from infrastructure.services.password_hasher import BcryptPasswordHasher
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.user import UserRepository


class RegisterUseCase:

    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
    ):
        self.user_repository = user_repository
        self.password_hasher = password_hasher

    async def execute(self, request: Request, username: str, password: str):

        hashed_password = self.password_hasher.hash_password(password)

        user = await self.user_repository.create_user(
            username=username, hashed_password=hashed_password
        )

        publisher: UserEventPublisher = request.app.state.publisher
        await publisher.publish_user_created(user)
        return {"user_id": user.id}
