from domain.models import Message
from domain.repositories.message import MessageRepository


class GetMessagesUseCase:
    def __init__(self, message_repo: MessageRepository):
        self.message_repo = message_repo

    async def execute(self, chat_id: int) -> Message:
        messages = await self.message_repo.get_messages(chat_id)

        return messages
