from chat_service.domain.repositories.chat import ChatRepository
from chat_service.domain.repositories.message import MessageRepository
from chat_service.domain.models import Message
from datetime import datetime, timezone


class SendMessageUseCase:
    def __init__(self, chat_repo: ChatRepository, message_repo: MessageRepository):
        self.chat_repo = chat_repo
        self.message_repo = message_repo

    async def execute(self, chat_id: int, sender_id: int, content: str) -> Message:
        # Optional: validate sender is a member of the chat
        chat = await self.chat_repo.get_chat(chat_id)

        chat_member_ids = [c.user_id for c in chat.members]

        if sender_id not in chat_member_ids:
            raise PermissionError("User not in chat")

        return await self.message_repo.send_message(chat_id, sender_id, content)
