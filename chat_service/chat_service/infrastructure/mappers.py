import stat
from chat_service.domain.models import Chat, FriendRequest
from chat_service.infrastructure.models import ChatModel, FriendRequestModel


def friend_request_from_model(friend_req: FriendRequestModel) -> FriendRequest:
    return FriendRequest(
        id=friend_req.id,
        from_user=friend_req.from_user,
        to_user=friend_req.to_user,
        status=friend_req.status,
    )


def chat_from_model(chat: ChatModel) -> Chat:

    return Chat(
        id=chat.id,
        is_group=chat.is_group,
        members=chat.members,
        created_at=chat.created_at,
    )
