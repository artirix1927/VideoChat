from typing import Dict
from fastapi import WebSocket


class CallConnectionManager:
    def __init__(self):
        self.active_calls: Dict[str, Dict[int, WebSocket]] = {}

    async def connect(self, call_id: str, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_calls.setdefault(call_id, {})[user_id] = websocket

    def disconnect(self, call_id: str, user_id: int):
        self.active_calls[call_id].pop(user_id, None)
        if not self.active_calls[call_id]:
            self.active_calls.pop(call_id)

    def get_peers(self, call_id: str, exclude_user: int = None):
        peers = self.active_calls.get(call_id, {})
        if exclude_user:
            return {uid: ws for uid, ws in peers.items() if uid != exclude_user}
        return peers
