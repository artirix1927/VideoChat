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
            to_user=user_id, status=FriendRequestStatus.PENDING.value
        )

        result = await self.session.execute(stmt)
        friend_requests = result.scalars().all()
        return [friend_request_from_model(req) for req in friend_requests]

    async def get_friends_for_user(self, user_id: int) -> list[FriendRequest]:
        stmt = select(FriendRequestModel).filter_by(
            to_user=user_id, status=FriendRequestStatus.ACCEPTED.value
        )
        result = await self.session.execute(stmt)
        friend_requests = result.scalars().all()
        return [friend_request_from_model(req) for req in friend_requests]

    async def accept(self, request_id: int) -> FriendRequest:
        return await self.change_status(
            request_id=request_id, status=FriendRequestStatus.ACCEPTED
        )

    async def create(
        self,
        from_id: int,
        to_id: int,
    ) -> FriendRequest:
        model = FriendRequestModel(
            from_user=from_id, to_user=to_id, status=FriendRequestStatus.PENDING.value
        )

        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return friend_request_from_model(model)

    async def reject(self, request_id: int):

        return await self.change_status(
            request_id=request_id, status=FriendRequestStatus.REJECTED
        )

    async def change_status(
        self, request_id: int, status: FriendRequestStatus
    ) -> FriendRequest:
        req = await self.session.get(FriendRequestModel, request_id)

        req.status = status.value
        self.session.add(req)
        await self.session.commit()
        return friend_request_from_model(req)
