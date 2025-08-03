from dataclasses import asdict
from chat_service.infrastructure.models import FriendRequestModel
from chat_service.domain.repositories.friend_request import FriendRequestRepository


class AcceptFriendRequestUseCase:
    def __init__(self, friend_request_repo: FriendRequestRepository):
        self.friend_request_repository = friend_request_repo

    async def execute(self, req_id: int):
        req: FriendRequestModel = await self.friend_request_repository.accept(req_id)
        return asdict(req)
