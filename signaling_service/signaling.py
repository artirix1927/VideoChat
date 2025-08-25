# signaling.py (or whatever module where you register router)
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from connection_manager import CallConnectionManager

logger = logging.getLogger(__name__)
router = APIRouter()
manager = CallConnectionManager()


@router.websocket("/ws/signaling/{call_id}/{user_id}")
async def signaling_ws(websocket: WebSocket, call_id: str, user_id: int):
    logger.info(f"incoming ws {call_id=} {user_id=}")

    # quick validation (FastAPI already casts path param types)
    if not call_id or not isinstance(user_id, int):
        logger.error(f"invalid params: {call_id}/{user_id}")
        await websocket.close(code=1003)
        return

    # 1) Register connection (accept happens inside manager.connect)
    if not await manager.connect(call_id, user_id, websocket):
        logger.warning(f"connect refused for {user_id}@{call_id}")
        await websocket.close(code=1008)
        return

    # 2) Send the new client the current peer-list (exclude itself)
    try:
        peers_snapshot = list(
            (await manager.get_peers(call_id, exclude_user=user_id)).keys()
        )
        await websocket.send_json(
            {"type": "peer-list", "peers": peers_snapshot, "from": "system"}
        )
    except Exception as e:
        logger.exception(f"failed to send peer-list to {user_id}@{call_id}: {e}")

    # 3) Notify other peers about the newcomer (they will initiate offers to the newcomer)
    try:
        await manager.broadcast(
            call_id,
            {"type": "new-peer", "peerId": user_id, "from": "system"},
            exclude_user=user_id,
        )
    except Exception as e:
        logger.exception(f"failed to broadcast new-peer for {user_id}@{call_id}: {e}")

    # 4) Start heartbeat task for this call (optional)
    async def heartbeat_task():
        try:
            while True:
                await asyncio.sleep(30)
                try:
                    disconnected = await manager.cleanup_stale_connections(call_id)
                    if disconnected:
                        logger.info(
                            f"cleaned {disconnected} stale connections in {call_id}"
                        )
                except Exception:
                    logger.exception("cleanup_stale_connections error")
        except asyncio.CancelledError:
            return

    hb = asyncio.create_task(heartbeat_task())

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=60.0)

                # heartbeat messages
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
                if data.get("type") == "pong":
                    continue

                if not isinstance(data, dict):
                    await websocket.send_json({"error": "invalid message format"})
                    continue

                if "from" not in data:
                    data["from"] = user_id

                target = data.get("target")
                if target is not None:
                    # forward to specific peer
                    await manager.send_to_peer(call_id, int(target), data)
                else:
                    # broadcast to all others
                    await manager.broadcast(call_id, data, exclude_user=user_id)

            except asyncio.TimeoutError:
                # try ping; if send fails, break to cleanup
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
            except WebSocketDisconnect:
                logger.info(f"WebSocketDisconnect for {user_id}@{call_id}")
                break
            except json.JSONDecodeError:
                await websocket.send_json({"error": "invalid json"})
            except Exception as e:
                logger.exception(
                    f"unexpected error in signaling loop for {user_id}@{call_id}: {e}"
                )
                break
    finally:
        hb.cancel()
        # notify others and remove socket from registry
        try:
            await manager.broadcast(
                call_id,
                {"type": "peer-disconnected", "peerId": user_id, "from": "system"},
                exclude_user=user_id,
            )
        except Exception:
            logger.exception("broadcast peer-disconnected failed")
        await manager.disconnect(call_id, user_id)
        logger.info(f"cleanup complete for {user_id}@{call_id}")
