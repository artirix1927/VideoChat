import httpx
from typing import Iterable, List
from uuid import UUID

AUTH_SERVICE_URL = "http://auth_service:8002"  # or your actual internal URL


async def get_users_by_ids(user_ids: List[UUID]) -> List[dict]:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{AUTH_SERVICE_URL}/users-by-ids/",
            json={"ids": [str(uid) for uid in user_ids]},
            timeout=5.0,
        )
        response.raise_for_status()
        return response.json()["users"]  # assuming backend returns { "users": [...] }


async def enrich_users(user_ids: Iterable[int]) -> dict[int, dict]:
    """Fetch user data by IDs and return a map: {id: user_data_dict}"""
    unique_ids = list(set(user_ids))
    users_data = await get_users_by_ids(unique_ids)
    return {u["id"]: u for u in users_data}
