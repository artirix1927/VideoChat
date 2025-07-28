from chat_service.infrastructure.utils import get_users_by_ids
from chat_service.domain.repositories.friend_request import FriendRequestRepository


class GetFriendsUseCase:

    def __init__(self, friend_request_repo: FriendRequestRepository):
        self.friend_request_repository = friend_request_repo

    async def execute(self, user_id: int):

        friend_requests = await self.friend_request_repository.get_friends_for_user(
            user_id
        )

        from_user_ids = [fr.from_user for fr in friend_requests]
        users_data = await get_users_by_ids(from_user_ids)

        # optional: map from_user → user data
        user_map = {u["id"]: u for u in users_data}

        enriched = []

        for fr in friend_requests:
            enriched.append(
                {
                    "id": str(fr.id),
                    "from_user": user_map.get(fr.from_user),  # could be None
                    "status": fr.status,
                    "to_user": fr.to_user,
                }
            )

        return enriched
