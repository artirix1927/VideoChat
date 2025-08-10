from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.db_session import get_db

from domain import (
    ChatRepository,
    FriendRequestRepository,
    MessageRepository,
)

from infrastructure import (
    SQLAlchemyChatRepository,
    SQLAlchemyFriendRequestRepository,
    SQLAlchemyMessageRepository,
)

from application import (
    GetFriendsUseCase,
    GetFriendRequestsUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    CreateFriendRequestUseCase,
    GetChats,
    GetMessagesUseCase,
    GetOrCreateChatUseCase,
)


"""TODO:
    1. Add auto accept on mutual requests
"""

router = APIRouter()


class FriendRequestInput(BaseModel):
    request_id: int


@router.get("/friend-requests")
async def get_friend_requests(
    user_id: int,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    friend_requests_use_case = GetFriendRequestsUseCase(
        friend_request_repo=friend_req_repo
    )
    res = await friend_requests_use_case.execute(user_id=user_id)

    return {"friend_requests": res}


@router.get("/friends")
async def get_friends(
    user_id: int,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    friends_use_case = GetFriendsUseCase(friend_request_repo=friend_req_repo)
    res = await friends_use_case.execute(user_id=user_id)

    return {"friends": res}


@router.post("/accept-friend-request")
async def accept_friend_request(
    body: FriendRequestInput,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    accept_request_use_case = AcceptFriendRequestUseCase(
        friend_request_repo=friend_req_repo
    )
    res = await accept_request_use_case.execute(body.request_id)

    return {"friend_request": res}


@router.post("/reject-friend-request")
async def reject_friend_request(
    body: FriendRequestInput,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    reject_request_use_case = RejectFriendRequestUseCase(
        friend_request_repo=friend_req_repo
    )
    res = await reject_request_use_case.execute(body.request_id)

    return {"friend_request": res}


@router.post("/create-friend-request")
async def create_friend_request(
    from_id: int,
    to_id: int,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    accept_request_use_case = CreateFriendRequestUseCase(
        friend_request_repo=friend_req_repo
    )
    res = await accept_request_use_case.execute(from_id=from_id, to_id=to_id)

    return {"friend_request": res}


@router.get("/messages")
async def get_messages(
    chat_id: int,
    session: AsyncSession = Depends(get_db),
):

    message_repo: MessageRepository = SQLAlchemyMessageRepository(session=session)

    get_messages_use_case = GetMessagesUseCase(message_repo=message_repo)

    res = await get_messages_use_case.execute(chat_id=chat_id)

    return {"messages": res}


@router.get("/chats")
async def get_chats(
    user_id: int,
    session: AsyncSession = Depends(get_db),
):
    chat_repo: ChatRepository = SQLAlchemyChatRepository(session=session)

    get_chats_use_case = GetChats(chat_repo=chat_repo)

    res = await get_chats_use_case.execute(user_id=user_id)

    return {"chats": res}


@router.post("/get-or-create-chat")
async def get_or_create_chat(
    members: set[int],
    session: AsyncSession = Depends(get_db),
):
    chat_repo: ChatRepository = SQLAlchemyChatRepository(session=session)

    get_chats_use_case = GetOrCreateChatUseCase(chat_repo=chat_repo)

    res = await get_chats_use_case.execute(user_ids=members)

    return {"chat": res}
