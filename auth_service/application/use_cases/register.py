from infrastructure.messaging.publishers.user_events import (
    UserEventPublisher,
)
from domain.repositories.password_hasher import PasswordHasher
from domain.repositories.user import UserRepository


class RegisterUseCase:

    def __init__(
        self,
        publisher: UserEventPublisher,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
    ):
        self.user_repository = user_repository
        self.password_hasher = password_hasher
        self.publisher = publisher

    async def execute(self, username: str, password: str, email: str):

        hashed_password = self.password_hasher.hash_password(password)

        user = await self.user_repository.create_user(
            username=username,
            hashed_password=hashed_password,
            email=email,
        )

        await self.publisher.publish_user_created(user)
        return {"user_id": user.id}
