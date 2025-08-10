from domain.repositories.user import UserRepository


class GetUsersByIdsUseCase:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def execute(self, ids: list[int]):
        users = await self.user_repository.get_by_ids(ids)

        return users
