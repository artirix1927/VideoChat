import uuid
from video_service.domain.models import CallSession
from video_service.domain.repositories.call_session import ICallSessionRepository


class VideoCallService:
    def __init__(self, repo: ICallSessionRepository):
        self.repo = repo

    async def create_call(self, host_id: int) -> CallSession:
        call = CallSession(id=str(uuid.uuid4()), host_id=host_id)
        call.add_participant(host_id)
        await self.repo.save(call)
        return call

    async def join_call(self, call_id: str, user_id: int):
        call = await self.repo.get_by_id(call_id)
        if call:
            call.add_participant(user_id)
            await self.repo.save(call)
        return call

    async def leave_call(self, call_id: str, user_id: int):
        call = await self.repo.get_by_id(call_id)
        if call:
            call.remove_participant(user_id)
            await self.repo.save(call)
        return call

    async def end_call(self, call_id: str):
        await self.repo.delete(call_id)

    async def get_participants(self, call_id: str):
        call = await self.repo.get_by_id(call_id)
        return call.participants if call else []
