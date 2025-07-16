from video_service.domain.models import CallSession
from video_service.domain.repositories.call_session import ICallSessionRepository


class InMemoryCallSessionRepo(ICallSessionRepository):
    def __init__(self):
        self.sessions = {}

    async def save(self, session: CallSession):
        self.sessions[session.id] = session

    async def get_by_id(self, call_id: str):
        return self.sessions.get(call_id)

    async def delete(self, call_id: str):
        self.sessions.pop(call_id, None)
