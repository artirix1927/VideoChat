from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from connection_manager import CallConnectionManager
import json
import logging
import asyncio
from typing import Dict, Any

router = APIRouter()
manager = CallConnectionManager()
logger = logging.getLogger(__name__)


@router.websocket("/ws/signaling/{call_id}/{user_id}")
async def signaling_ws(websocket: WebSocket, call_id: str, user_id: int):
    # Validate parameters
    if not call_id or not isinstance(user_id, int):
        logger.error(f"Invalid connection parameters: {call_id}/{user_id}")
        await websocket.close(code=1003)  # Invalid Data
        return

    # Get existing peers before connecting
    existing_peers = list(manager.get_peers(call_id).keys())
    logger.info(f"Existing peers in call {call_id}: {existing_peers}")

    # Connect to the call
    if not await manager.connect(call_id, user_id, websocket):
        await websocket.close(code=1008)  # Policy Violation
        return

    try:
        # Notify existing peers about new peer
        if existing_peers:
            await manager.broadcast(
                call_id,
                {"type": "new-peer", "peerId": user_id, "from": "system"},
                exclude_user=user_id,
            )
            logger.info(
                f"Notified {len(existing_peers)} existing peers about user {user_id}"
            )

        # Notify new peer about existing peers
        for peer_id in existing_peers:
            try:
                await websocket.send_json(
                    {"type": "new-peer", "peerId": peer_id, "from": "system"}
                )
                logger.info(
                    f"Notified new user {user_id} about existing peer {peer_id}"
                )
            except Exception as e:
                logger.error(f"Failed to notify new user about peer {peer_id}: {e}")

        while True:
            try:
                # Receive with timeout
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30.0)

                # Handle ping/pong
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
                elif data.get("type") == "pong":
                    continue

                # Validate message structure
                if not isinstance(data, dict):
                    await websocket.send_json(
                        {
                            "error": "Invalid message format",
                            "hint": "Must be JSON object",
                        }
                    )
                    continue

                # Add sender info if not present
                if "from" not in data:
                    data["from"] = user_id

                logger.info(
                    f"Broadcasting {data.get('type')} from {user_id} to call {call_id}"
                )

                # Broadcast to specific target or all peers
                target = data.get("target")
                if target:
                    # Send to specific peer
                    await manager.send_to_peer(call_id, target, data)
                    logger.info(f"Sent {data.get('type')} from {user_id} to {target}")
                else:
                    # Broadcast to all peers
                    sent_count = await manager.broadcast(
                        call_id, data, exclude_user=user_id
                    )
                    logger.info(
                        f"Broadcasted {data.get('type')} from {user_id} to {sent_count} peers"
                    )

            except asyncio.TimeoutError:
                # Send ping to check connection
                try:
                    await websocket.send_json({"type": "ping"})
                except:
                    break  # Connection is dead

            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            except WebSocketDisconnect:
                break  # Normal disconnect

            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                break

    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
    finally:
        try:
            # Notify other peers about disconnection
            await manager.broadcast(
                call_id,
                {"type": "peer-disconnected", "peerId": user_id, "from": "system"},
                exclude_user=user_id,
            )
            await manager.safe_disconnect(call_id, user_id)
            logger.info(f"User {user_id} disconnected from call {call_id}")
        except Exception as e:
            logger.error(f"Cleanup error: {str(e)}")
