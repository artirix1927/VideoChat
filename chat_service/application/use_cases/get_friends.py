from infrastructure.utils import enrich_users
from domain.repositories.friend_request import FriendRequestRepository


class GetFriendsUseCase:

    def __init__(self, friend_request_repo: FriendRequestRepository):
        self.friend_request_repository = friend_request_repo

    async def execute(self, user_id: int):

        friend_requests = await self.friend_request_repository.get_friends_for_user(
            user_id
        )

        from_user_ids = [fr.from_user for fr in friend_requests]
        users_map = await enrich_users(from_user_ids)

        return [fq.to_dict(users_map) for fq in friend_requests]
