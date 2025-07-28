from abc import ABC, abstractmethod

from chat_service.domain.models import FriendRequest, User


class FriendRequestRepository(ABC):

    @abstractmethod
    async def get_friend_requests_for_user(self, user_id: int) -> list[FriendRequest]:
        pass

    @abstractmethod
    async def get_friends_for_user(self, user_id: int) -> list[FriendRequest]:
        pass

    @abstractmethod
    async def accept_friend_request(self, request_id: int):
        pass

    @abstractmethod
    async def create_friend_request(
        self,
        from_id: int,
        to_id: int,
    ) -> FriendRequest:
        pass
