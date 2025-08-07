from dataclasses import asdict
from chat_service.infrastructure.models import FriendRequestModel
from chat_service.domain.repositories.friend_request import FriendRequestRepository


class CreateFriendRequestUseCase:
    def __init__(self, friend_request_repo: FriendRequestRepository):
        self.friend_request_repository = friend_request_repo

    async def execute(
        self,
        from_id: int,
        to_id: int,
    ):
        req: FriendRequestModel = await self.friend_request_repository.create(
            from_id=from_id, to_id=to_id
        )

        req = await self.friend_request_repository.auto_accept_if_mutual(
            request_id=req.id
        )

        return asdict(req)
