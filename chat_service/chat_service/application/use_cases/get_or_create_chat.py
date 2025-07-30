from chat_service.infrastructure.utils import enrich_users
from chat_service.domain.repositories.chat import ChatRepository
from chat_service.domain.models import Chat
from typing import Set


class GetOrCreateChatUseCase:
    def __init__(self, chat_repo: ChatRepository):
        self.chat_repo: ChatRepository = chat_repo

    async def execute(self, user_ids: Set[int]) -> Chat:
        existing = await self.chat_repo.get_chat_by_members(user_ids)

        chat_to_return = (
            existing if existing else await Chat.create_chat(members=user_ids)
        )

        all_member_ids = [m.user_id for m in chat_to_return.members]
        user_map = await enrich_users(all_member_ids)

        return chat_to_return.to_dict(user_map)
