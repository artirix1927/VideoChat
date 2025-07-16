import json
from auth_service.infrastructure.services.email_sender import EmailTwoFactorSender
import asyncio
import aio_pika

from dotenv import load_dotenv

load_dotenv()


async def handle_two_factor_code_generated(event: dict):
    sender = EmailTwoFactorSender()
    await sender.send_code(event.get("user_id"), event.get("code"))


async def main():
    connection = await aio_pika.connect_robust(
        "amqp://guest:guest@rabbitmq/",
    )
    channel = await connection.channel()

    queue = await channel.declare_queue("user.events", durable=True)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                data = message.body.decode()
                data = json.loads(data)
                await handle_two_factor_code_generated(data)


asyncio.run(main())
