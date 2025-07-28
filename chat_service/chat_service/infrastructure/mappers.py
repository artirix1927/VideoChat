import stat
from chat_service.domain.models import FriendRequest
from chat_service.infrastructure.models import FriendRequestModel


def friend_request_from_model(friend_req: FriendRequestModel) -> FriendRequest:
    return FriendRequest(
        id=friend_req.id,
        from_user=friend_req.from_user,
        to_user=friend_req.to_user,
        status=friend_req.status,
    )
