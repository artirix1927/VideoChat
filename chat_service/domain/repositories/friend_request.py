from abc import ABC, abstractmethod

from domain.models import FriendRequest, FriendRequestStatus, User


class FriendRequestRepository(ABC):

    @abstractmethod
    async def get_friend_requests_for_user(self, user_id: int) -> list[FriendRequest]:
        pass

    @abstractmethod
    async def get_friends_for_user(self, user_id: int) -> list[FriendRequest]:
        pass

    @abstractmethod
    async def accept(self, request_id: int) -> FriendRequest:
        pass

    @abstractmethod
    async def create(
        self,
        from_id: int,
        to_id: int,
    ) -> FriendRequest:
        pass

    @abstractmethod
    async def reject(self, request_id: int) -> FriendRequest:
        pass

    @abstractmethod
    async def auto_accept_if_mutual(self, request_id: int) -> FriendRequest:
        pass
