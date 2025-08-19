from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional


@dataclass
class User:
    id: int
    username: str
    email: str


@dataclass
class ChatMember:
    user_id: int
    chat_id: int


class FriendRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


@dataclass
class FriendRequest:
    id: Optional[int]  # Allow None before insert
    from_user: int
    to_user: int
    status: FriendRequestStatus = FriendRequestStatus.PENDING

    def to_dict(self, user_map: dict[int, dict]) -> dict:
        return {
            "id": self.id,
            "from_user": user_map.get(self.from_user),
            "to_user": user_map.get(self.to_user),
            "status": self.status,
        }


@dataclass
class Message:
    id: Optional[int]
    chat_id: int
    sender_id: int
    content: str
    timestamp: datetime


@dataclass
class Chat:
    id: Optional[int]
    created_at: datetime
    is_group: bool
    members: List[ChatMember] = field(default_factory=list)

    @staticmethod
    def create_chat(members: List[ChatMember]) -> "Chat":
        return Chat(
            id=None,
            created_at=datetime.now(timezone.utc),
            is_group=len(members) > 2,
            members=members,
        )

    def to_dict(self, user_map: dict[int, dict]) -> dict:
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "is_group": self.is_group,
            "members": [
                {
                    "user_id": m.user_id,
                    "user": user_map.get(m.user_id),
                }
                for m in self.members
            ],
        }
