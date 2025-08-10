import asyncio
import json
import signal
from dotenv import load_dotenv
import aio_pika

from infrastructure.services.email_sender import EmailTwoFactorSender

load_dotenv()

should_exit = asyncio.Event()


async def handle_two_factor_code_generated(event: dict):
    sender = EmailTwoFactorSender()
    await sender.send_code(event.get("user_id"), event.get("code"))


async def message_handler(message: aio_pika.IncomingMessage):
    async with message.process():
        data = json.loads(message.body.decode())
        await handle_two_factor_code_generated(data)


async def main():
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, should_exit.set)

    connection = await aio_pika.connect_robust("amqp://guest:guest@rabbitmq/")
    channel = await connection.channel()
    queue = await channel.declare_queue("user.events", durable=True)

    consumer_tag = await queue.consume(message_handler)

    await should_exit.wait()

    print("Shutting down gracefully...")

    await queue.cancel(consumer_tag)
    await channel.close()
    await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
