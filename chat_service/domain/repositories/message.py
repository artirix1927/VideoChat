from abc import ABC, abstractmethod
from domain.models import Message


class MessageRepository(ABC):
    @abstractmethod
    async def send_message(self, chat_id: int, sender_id: int, content: str) -> Message:
        pass

    @abstractmethod
    async def get_messages(self, chat_id: int) -> list[Message]:
        pass
