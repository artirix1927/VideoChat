from dataclasses import asdict
from domain.repositories.token_generator import TokenGenerator
from domain.repositories.user import UserRepository


class GetUserUseCase:
    def __init__(
        self, user_repository: UserRepository, token_generator: TokenGenerator
    ):
        self.user_repository = user_repository
        self.token_generator = token_generator

    async def execute(self, token: str):
        user_id, _ = self.token_generator.extract_from_payload(token)

        user = await self.user_repository.get_by_id(user_id)

        return asdict(user)
