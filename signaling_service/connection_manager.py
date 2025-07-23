import asyncio
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)


class CallConnectionManager:
    def __init__(self):
        self.active_calls: Dict[str, Dict[int, WebSocket]] = {}
        self._lock = asyncio.Lock()  # For thread-safe operations

    async def connect(self, call_id: str, user_id: int, websocket: WebSocket) -> bool:
        """Add new connection to the call"""
        try:
            async with self._lock:
                if (
                    call_id in self.active_calls
                    and user_id in self.active_calls[call_id]
                ):
                    logger.warning(
                        f"User {user_id} already connected to call {call_id}"
                    )
                    return False

                await websocket.accept()
                self.active_calls.setdefault(call_id, {})[user_id] = websocket
                logger.info(f"User {user_id} connected to call {call_id}")
                return True

        except Exception as e:
            logger.error(f"Error connecting user {user_id}: {str(e)}")
            await self._safe_close(websocket)
            return False

    async def disconnect(self, call_id: str, user_id: int) -> bool:
        """Remove connection from the call"""
        try:
            async with self._lock:
                if call_id not in self.active_calls:
                    return False

                if user_id not in self.active_calls[call_id]:
                    return False

                websocket = self.active_calls[call_id].pop(user_id)
                await self._safe_close(websocket)
                logger.info(f"User {user_id} disconnected from call {call_id}")

                # Clean up empty calls
                if not self.active_calls[call_id]:
                    self.active_calls.pop(call_id)
                    logger.info(f"Call {call_id} has no more participants")

                return True

        except Exception as e:
            logger.error(f"Error disconnecting user {user_id}: {str(e)}")
            return False

    def get_peers(
        self, call_id: str, exclude_user: Optional[int] = None
    ) -> Dict[int, WebSocket]:
        """Get all active connections for a call"""
        if call_id not in self.active_calls:
            return {}

        peers = self.active_calls[call_id]
        if exclude_user is not None:
            return {uid: ws for uid, ws in peers.items() if uid != exclude_user}
        return peers.copy()

    async def send_to_peer(self, call_id: str, target_user: int, message: dict) -> bool:
        """Send message to a specific peer"""
        if (
            call_id not in self.active_calls
            or target_user not in self.active_calls[call_id]
        ):
            logger.warning(f"Target user {target_user} not found in call {call_id}")
            return False

        try:
            websocket = self.active_calls[call_id][target_user]
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"Failed to send to user {target_user}: {str(e)}")
            await self.disconnect(call_id, target_user)
            return False

    async def broadcast(
        self, call_id: str, message: dict, exclude_user: Optional[int] = None
    ) -> int:
        """Send message to all participants in a call"""
        if call_id not in self.active_calls:
            return 0

        successful_sends = 0
        peers = self.get_peers(call_id, exclude_user)

        for user_id, websocket in peers.items():
            try:
                await websocket.send_json(message)
                successful_sends += 1
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {str(e)}")
                await self.disconnect(call_id, user_id)

        return successful_sends

    async def _safe_close(self, websocket: WebSocket) -> None:
        """Safely close a websocket connection"""
        try:
            if websocket.client_state.value < 3:  # 3 = CLOSED state
                await websocket.close()
        except Exception as e:
            logger.warning(f"Error closing websocket: {str(e)}")

    def is_connected(self, call_id: str, user_id: int) -> bool:
        """Check if connection exists"""
        return call_id in self.active_calls and user_id in self.active_calls[call_id]

    async def safe_disconnect(self, call_id: str, user_id: int):
        """Disconnect without raising exceptions"""
        try:
            if self.is_connected(call_id, user_id):
                ws = self.active_calls[call_id][user_id]
                try:
                    if ws.client_state.value < 3:  # Not CLOSED
                        await ws.close()
                except:
                    pass
                self.active_calls[call_id].pop(user_id, None)
                if not self.active_calls[call_id]:
                    self.active_calls.pop(call_id, None)
        except Exception as e:
            logger.error(f"Safe disconnect failed: {str(e)}")
