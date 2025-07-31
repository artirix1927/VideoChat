from datetime import datetime, timezone
from typing import List
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from chat_service.domain.models import FriendRequestStatus


class Base(DeclarativeBase):
    pass


class FriendRequestModel(Base):
    __tablename__ = "friend_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_user: Mapped[int] = mapped_column(nullable=False)
    to_user: Mapped[int] = mapped_column(nullable=False)  # no ForeignKey (user service)
    status: Mapped[FriendRequestStatus] = mapped_column(
        SQLEnum(
            FriendRequestStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            name="friendrequeststatus",
        ),
        nullable=False,
        default=FriendRequestStatus.PENDING.value,
    )

    __table_args__ = (UniqueConstraint("from_user", "to_user", name="uq_from_to_user"),)


class ChatMemberModel(Base):
    __tablename__ = "chat_members"

    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        primary_key=True
    )  # no ForeignKey (user service)


class ChatModel(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(primary_key=True)
    is_group: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.now(timezone.utc)
    )  # ✅ cleaned up

    members: Mapped[List[ChatMemberModel]] = relationship(
        "ChatMemberModel", backref="chat", cascade="all, delete"
    )


class MessageModel(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id"), nullable=False)
    sender_id: Mapped[int] = mapped_column(nullable=False)  # no fk (user service)
    content: Mapped[str] = mapped_column(nullable=False)
    timestamp: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc))
