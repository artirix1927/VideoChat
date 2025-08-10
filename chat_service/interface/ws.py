from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, Depends
from application.use_cases.send_message import SendMessageUseCase
from application.use_cases.get_or_create_chat import GetOrCreateChatUseCase

from infrastructure.repositories.sqlalchemy_chat import (
    SQLAlchemyChatRepository,
)
from sqlalchemy.ext.asyncio import AsyncSession
from infrastructure.repositories.sqlalchemy_message import (
    SQLAlchemyMessageRepository,
)
from infrastructure.db_session import get_db

connections: dict[int, set[WebSocket]] = {}

router = APIRouter()


@router.websocket("/ws/chat/{chat_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_id: int,
    user_id: int = Query(),
    session: AsyncSession = Depends(get_db),
):
    await websocket.accept()

    chat_id = int(chat_id)
    connections.setdefault(chat_id, set()).add(websocket)

    chat_repo = SQLAlchemyChatRepository(session)
    msg_repo = SQLAlchemyMessageRepository(session)
    use_case = SendMessageUseCase(chat_repo, msg_repo)

    try:
        while True:
            data = await websocket.receive_json()
            content = data["content"]
            message = await use_case.execute(chat_id, user_id, content)

            # Broadcast to everyone in the chat
            for conn in connections[chat_id]:
                await conn.send_json(
                    {
                        "id": message.id,
                        "sender_id": message.sender_id,
                        "content": message.content,
                        "timestamp": message.timestamp.isoformat(),
                    }
                )
    except WebSocketDisconnect:
        connections[chat_id].remove(websocket)
