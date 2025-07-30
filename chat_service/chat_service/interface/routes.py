from fastapi import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from chat_service.application.use_cases.get_friends import GetFriendsUseCase
from chat_service.application.use_cases.get_friend_requests import (
    GetFriendRequestsUseCase,
)
from chat_service.application.use_cases.accept_friend_request import (
    AcceptFriendRequestUseCase,
)
from chat_service.application.use_cases.create_friend_request import (
    CreateFriendRequestUseCase,
)
from chat_service.application.use_cases.get_chats import GetChats
from chat_service.application.use_cases.get_messages import (
    GetMessagesUseCase,
)
from chat_service.application.use_cases.get_or_create_chat import (
    GetOrCreateChatUseCase,
)
from chat_service.domain.repositories.chat import ChatRepository
from chat_service.domain.repositories.message import MessageRepository
from chat_service.infrastructure.repositories.sqlalchemy_chat import (
    SQLAlchemyChatRepository,
)
from chat_service.infrastructure.repositories.sqlalchemy_message import (
    SQLAlchemyMessageRepository,
)
from chat_service.domain.repositories.friend_request import (
    FriendRequestRepository,
)
from chat_service.infrastructure.repositories.sqlalchemy_friend_request import (
    SQLAlchemyFriendRequestRepository,
)
from chat_service.infrastructure.db_session import get_db


router = APIRouter()


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
    request_id: int,
    session: AsyncSession = Depends(get_db),
):
    friend_req_repo: FriendRequestRepository = SQLAlchemyFriendRequestRepository(
        session=session
    )
    accept_request_use_case = AcceptFriendRequestUseCase(
        friend_request_repo=friend_req_repo
    )
    res = await accept_request_use_case.execute(request_id)

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

    """TODO:
        1. Add auto accept on mutual requests
    """

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
