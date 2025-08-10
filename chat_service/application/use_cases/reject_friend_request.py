from dataclasses import asdict
from infrastructure.models import FriendRequestModel
from domain.repositories.friend_request import FriendRequestRepository


class RejectFriendRequestUseCase:
    def __init__(self, friend_request_repo: FriendRequestRepository):
        self.friend_request_repository = friend_request_repo

    async def execute(self, req_id: int):
        req: FriendRequestModel = await self.friend_request_repository.reject(req_id)
        return asdict(req)
