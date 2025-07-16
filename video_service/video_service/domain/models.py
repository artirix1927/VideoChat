from dataclasses import dataclass, field
from typing import List
from datetime import datetime, timezone


@dataclass
class Participant:
    user_id: int
    joined_at: datetime = field(default_factory=datetime.now(timezone.utc))


@dataclass
class CallSession:
    id: str
    host_id: int
    participants: List[Participant] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now(timezone.utc))

    def add_participant(self, user_id: int):
        if any(p.user_id == user_id for p in self.participants):
            return  # Already joined
        self.participants.append(Participant(user_id))

    def remove_participant(self, user_id: int):
        self.participants = [p for p in self.participants if p.user_id != user_id]
