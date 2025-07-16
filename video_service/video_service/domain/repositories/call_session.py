from abc import ABC, abstractmethod
from typing import Optional, List

from video_service.domain.models import CallSession


class ICallSessionRepository(ABC):
    @abstractmethod
    async def save(self, session: CallSession): ...

    @abstractmethod
    async def get_by_id(self, call_id: str) -> Optional[CallSession]: ...

    @abstractmethod
    async def delete(self, call_id: str): ...
