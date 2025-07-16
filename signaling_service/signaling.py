from fastapi import APIRouter, WebSocket
from connection_manager import CallConnectionManager

router = APIRouter()
manager = CallConnectionManager()


@router.websocket("/ws/signaling/{call_id}/{user_id}")
async def signaling_ws(websocket: WebSocket, call_id: str, user_id: int):
    await manager.connect(call_id, user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            peers = manager.get_peers(call_id, exclude_user=user_id)
            for peer_id, conn in peers.items():
                await conn.send_json({"from": user_id, "data": data})
    except:
        manager.disconnect(call_id, user_id)
        await websocket.close()
