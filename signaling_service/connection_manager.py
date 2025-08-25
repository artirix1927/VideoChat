# connection_manager.py
import asyncio
from typing import Dict, Optional
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class CallConnectionManager:
    def __init__(self):
        # active_calls[call_id][user_id] = WebSocket
        self.active_calls: Dict[str, Dict[int, WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, call_id: str, user_id: int, websocket: WebSocket) -> bool:
        """Accept and register a websocket for a call. Returns False if user already present."""
        async with self._lock:
            if call_id not in self.active_calls:
                self.active_calls[call_id] = {}
            if user_id in self.active_calls[call_id]:
                logger.warning(f"user {user_id} already connected to call {call_id}")
                return False
            try:
                await websocket.accept()
                self.active_calls[call_id][user_id] = websocket
                logger.info(f"user {user_id} connected to call {call_id}")
                return True
            except Exception:
                # defensively try to close
                await self._safe_close(websocket)
                logger.exception(
                    f"Failed to accept/register websocket for {user_id}@{call_id}"
                )
                return False

    async def disconnect(self, call_id: str, user_id: int) -> None:
        """Remove a connection from the registry and close the socket safely."""
        websocket = None
        async with self._lock:
            if (
                call_id not in self.active_calls
                or user_id not in self.active_calls[call_id]
            ):
                return
            websocket = self.active_calls[call_id].pop(user_id, None)
            if not self.active_calls[call_id]:
                self.active_calls.pop(call_id, None)
        if websocket:
            await self._safe_close(websocket)
            logger.info(f"user {user_id} disconnected from call {call_id}")

    async def get_peers(
        self, call_id: str, exclude_user: Optional[int] = None
    ) -> Dict[int, WebSocket]:
        """Return a snapshot copy of peers for a call (safe to iterate)."""
        async with self._lock:
            if call_id not in self.active_calls:
                return {}
            snapshot = self.active_calls[call_id].copy()
        if exclude_user is not None:
            return {uid: ws for uid, ws in snapshot.items() if uid != exclude_user}
        return snapshot

    async def send_to_peer(self, call_id: str, target_user: int, message: dict) -> bool:
        """Send a JSON message to a specific peer. If sending fails, remove that peer."""
        websocket = None
        async with self._lock:
            if (
                call_id not in self.active_calls
                or target_user not in self.active_calls[call_id]
            ):
                logger.warning(f"target {target_user} not found in call {call_id}")
                return False
            websocket = self.active_calls[call_id][target_user]

        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            logger.warning(f"send_to_peer failed for {target_user}@{call_id}: {e}")
            # remove the socket (disconnect will close it)
            await self.disconnect(call_id, target_user)
            return False

    async def broadcast(
        self, call_id: str, message: dict, exclude_user: Optional[int] = None
    ) -> int:
        """Broadcast a JSON message to all peers (snapshot then send outside lock)."""
        async with self._lock:
            if call_id not in self.active_calls:
                return 0
            peers_snapshot = {
                uid: ws
                for uid, ws in self.active_calls[call_id].items()
                if uid != exclude_user
            }

        sent = 0
        for uid, ws in list(peers_snapshot.items()):
            try:
                await ws.send_json(message)
                sent += 1
            except Exception as e:
                logger.warning(f"broadcast send failed to {uid}@{call_id}: {e}")
                await self.disconnect(call_id, uid)
        return sent

    async def _safe_close(self, websocket: WebSocket) -> None:
        """Close a websocket defensively."""
        try:
            state = getattr(websocket, "client_state", None)
            if state is None or getattr(state, "value", 3) < 3:
                await websocket.close()
        except Exception as e:
            logger.debug(f"_safe_close warning: {e}")

    def is_connected(self, call_id: str, user_id: int) -> bool:
        """Quick (potentially slightly stale) check if a user is connected."""
        return call_id in self.active_calls and user_id in self.active_calls[call_id]

    async def cleanup_stale_connections(self, call_id: str) -> int:
        """Ping peers and drop those that fail to respond (best-effort)."""
        async with self._lock:
            if call_id not in self.active_calls:
                return 0
            peers_snapshot = self.active_calls[call_id].copy()

        disconnected = 0
        for uid, ws in list(peers_snapshot.items()):
            try:
                await ws.send_json({"type": "ping"})
            except Exception:
                logger.warning(f"stale connection detected for {uid}@{call_id}")
                await self.disconnect(call_id, uid)
                disconnected += 1
        return disconnected
