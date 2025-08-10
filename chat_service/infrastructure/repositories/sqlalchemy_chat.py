from pickletools import read_uint1
from typing import List
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from infrastructure.mappers import chat_from_model
from domain.models import Chat
from domain.repositories.chat import ChatRepository
from infrastructure.models import ChatModel, ChatMemberModel
from sqlalchemy import func


class SQLAlchemyChatRepository(ChatRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_chat(self, chat: Chat) -> Chat:
        chat_model = ChatModel(is_group=len(chat.members) > 2)
        self.session.add(chat_model)
        await self.session.flush()  # get id before adding members

        for user_id in chat.members:
            self.session.add(ChatMemberModel(chat_id=chat_model.id, user_id=user_id))
        await self.session.commit()

        # Reload chat with members
        stmt = (
            select(ChatModel)
            .options(selectinload(ChatModel.members))
            .where(ChatModel.id == chat_model.id)
        )
        result = await self.session.execute(stmt)
        chat_with_members = result.scalar_one()

        return chat_from_model(chat_with_members)

    async def get_chat_members(self, chat_id: int) -> set[int]:
        chat = await self.get_chat(chat_id=chat_id)

        return chat.members

    async def get_chat(self, chat_id: int) -> Chat:
        stmt = (
            select(ChatModel)
            .where(ChatModel.id == chat_id)
            .options(selectinload(ChatModel.members))  # <-- add this
        )

        result = await self.session.execute(stmt)
        chat = result.scalar_one_or_none()

        return chat_from_model(chat)

    async def get_chat_by_members(self, user_ids: set[int]) -> Chat | None:
        if not user_ids:
            return None

        user_count = len(user_ids)

        # Subquery: Find chat_ids where the count of members matches and all members are in user_ids
        subquery = (
            select(ChatMemberModel.chat_id)
            .group_by(ChatMemberModel.chat_id)
            .having(
                func.count(ChatMemberModel.user_id) == user_count,
                func.count(func.distinct(ChatMemberModel.user_id)).filter(
                    ChatMemberModel.user_id.in_(user_ids)
                )
                == user_count,
            )
            .subquery()
        )

        stmt = (
            select(ChatModel)
            .where(ChatModel.id.in_(select(subquery)))
            .options(selectinload(ChatModel.members))
        )

        result = await self.session.execute(stmt)
        chat = result.scalars().first()
        return chat_from_model(chat) if chat else None

    async def get_chats(self, user_id: int) -> List[Chat]:
        stmt = (
            select(ChatModel)
            .join(ChatMemberModel)
            .where(ChatMemberModel.user_id == user_id)
            .options(selectinload(ChatModel.members))
        )
        result = await self.session.execute(stmt)
        chats = result.scalars().unique().all()
        return [chat_from_model(chat) for chat in chats]
