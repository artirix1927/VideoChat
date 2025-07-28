from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from chat_service.infrastructure.mappers import friend_request_from_model
from chat_service.domain.models import FriendRequest, FriendRequestStatus
from chat_service.domain.repositories.friend_request import FriendRequestRepository
from chat_service.infrastructure.models import FriendRequestModel


class SQLAlchemyFriendRequestRepository(FriendRequestRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_friend_requests_for_user(self, user_id: int) -> list[FriendRequest]:
        stmt = select(FriendRequestModel).filter_by(
            to_user=user_id, status=FriendRequestStatus.PENDING
        )

        result = await self.session.execute(stmt)
        friend_requests = result.scalars().all()
        return [friend_request_from_model(req) for req in friend_requests]

    async def get_friends_for_user(self, user_id: int) -> list[FriendRequest]:
        stmt = select(FriendRequestModel).filter_by(
            to_user=user_id, status=FriendRequestStatus.ACCEPTED
        )

        result = await self.session.execute(stmt)
        friend_requests = result.scalars().all()
        return [friend_request_from_model(req) for req in friend_requests]

    async def accept_friend_request(self, request_id: int) -> FriendRequest:
        req = await self.session.get(FriendRequestModel, request_id)

        req.status = FriendRequestStatus.ACCEPTED
        self.session.add(req)
        await self.session.commit()
        return friend_request_from_model(req)

    async def create_friend_request(
        self,
        from_id: int,
        to_id: int,
    ):
        model = FriendRequestModel(
            from_user=from_id, to_user=to_id, status=FriendRequestStatus.PENDING
        )

        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return friend_request_from_model(model)
