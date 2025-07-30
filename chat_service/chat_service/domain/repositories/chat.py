from abc import ABC, abstractmethod
from typing import List
from chat_service.domain.models import Chat


class ChatRepository(ABC):
    @abstractmethod
    async def create_chat(self, members: set[int]) -> Chat:
        pass

    @abstractmethod
    async def get_chat_members(self, chat_id: int) -> set[int]:
        pass

    @abstractmethod
    async def get_chat(self, chat_id: int) -> Chat | None:
        pass

    @abstractmethod
    async def get_chat_by_members(self, user_ids: set[int]) -> Chat | None:
        pass

    @abstractmethod
    async def get_chats(self, user_id: int) -> List[Chat]:
        pass
