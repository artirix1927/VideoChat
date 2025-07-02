from domain.models import User
from domain.repositories.user import UserRepository


class DeleteUseCase:
    def __init__(
        self,
        user_repository: UserRepository,
    ):
        self.user_repository = user_repository

    async def execute(self, user_id: int):
        await self.user_repository.delete_by_id(id=user_id)
        return {"success": "true"}
