from fastapi import APIRouter, Depends, HTTPException

from video_service.application.services.video_call import VideoCallService
from video_service.infrastructure.repositores.in_memory_call_session import (
    InMemoryCallSessionRepo,
)


router = APIRouter()
repo = InMemoryCallSessionRepo()
service = VideoCallService(repo)


@router.post("/calls")
async def create_call(host_id: int):
    return await service.create_call(host_id)


@router.post("/calls/{call_id}/join")
async def join_call(call_id: str, user_id: int):
    call = await service.join_call(call_id, user_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.post("/calls/{call_id}/leave")
async def leave_call(call_id: str, user_id: int):
    call = await service.leave_call(call_id, user_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/calls/{call_id}")
async def get_participants(call_id: str):
    return await service.get_participants(call_id)


@router.delete("/calls/{call_id}")
async def end_call(call_id: str):
    await service.end_call(call_id)
    return {"detail": "Call ended"}
