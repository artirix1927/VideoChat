from fastapi import FastAPI
from contextlib import asynccontextmanager
import aio_pika

from infrastructure.messaging.publishers.user_events import UserEventPublisher
from interface.routes import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    connection = await aio_pika.connect_robust("amqp://guest:guest@localhost/")
    app.state.rabbit_connection = connection
    app.state.publisher = UserEventPublisher(connection)

    yield  # This pauses until shutdown

    # Shutdown
    await connection.close()


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
