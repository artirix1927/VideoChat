from datetime import datetime
import json

from sqlalchemy import UUID
from domain.models import TwoFactorCode, User
import aio_pika
from dataclasses import asdict


def serialize_event(event):
    def default(o):
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, UUID):
            return str(o)
        return str(o)  # fallback

    return json.dumps(event, default=default)


class UserEventPublisher:
    def __init__(self, connection: aio_pika.RobustConnection):
        self.connection = connection

    async def publish_user_created(self, user: User):
        channel = await self.connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(body=json.dumps(asdict(user)).encode()),
            routing_key="user.created",
        )

    async def publish_two_factor_code_generated(self, event: TwoFactorCode):
        channel = await self.connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(body=serialize_event(asdict(event)).encode()),
            routing_key="user.events",
        )
