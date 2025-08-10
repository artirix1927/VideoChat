import asyncio
import aio_pika


async def main():
    connection = await aio_pika.connect_robust(
        "amqp://guest:guest@rabbitmq/",
    )
    channel = await connection.channel()

    queue = await channel.declare_queue("user.created", durable=True)

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                print("Received:", message.body.decode())


asyncio.run(main())
