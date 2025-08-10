from infrastructure.utils import enrich_users
from domain.repositories.chat import ChatRepository
from domain.models import Chat
from typing import List


class GetChats:
    def __init__(self, chat_repo: ChatRepository):
        self.chat_repo: ChatRepository = chat_repo

    async def execute(self, user_id: int) -> List[Chat]:
        chats = await self.chat_repo.get_chats(user_id)

        all_member_ids = [m.user_id for chat in chats for m in chat.members]
        user_map = await enrich_users(all_member_ids)

        return [chat.to_dict(user_map) for chat in chats]
