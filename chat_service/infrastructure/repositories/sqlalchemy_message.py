from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from domain.models import Message
from domain.repositories.message import MessageRepository
from infrastructure.models import MessageModel


class SQLAlchemyMessageRepository(MessageRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def send_message(self, chat_id: int, sender_id: int, content: str) -> Message:
        msg_model = MessageModel(chat_id=chat_id, sender_id=sender_id, content=content)
        self.session.add(msg_model)
        await self.session.commit()
        await self.session.refresh(msg_model)
        return Message(
            id=msg_model.id,
            chat_id=chat_id,
            sender_id=sender_id,
            content=content,
            timestamp=msg_model.timestamp,
        )

    async def get_messages(self, chat_id: int) -> list[Message]:
        stmt = select(MessageModel).where(MessageModel.chat_id == chat_id)
        result = await self.session.execute(stmt)
        return [
            Message(
                id=row.id,
                chat_id=row.chat_id,
                sender_id=row.sender_id,
                content=row.content,
                timestamp=row.timestamp,
            )
            for row in result.scalars().all()
        ]
