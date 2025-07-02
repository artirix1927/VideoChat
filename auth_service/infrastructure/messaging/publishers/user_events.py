import json
from domain.models import User
import aio_pika
from dataclasses import asdict


class UserEventPublisher:
    def __init__(self, connection: aio_pika.RobustConnection):
        self.connection = connection

    async def publish_user_created(self, user: User):
        channel = await self.connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(body=json.dumps(asdict(user)).encode()),
            routing_key="user.created",
        )
