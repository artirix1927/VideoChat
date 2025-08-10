from dotenv import load_dotenv
from fastapi import FastAPI
from contextlib import asynccontextmanager
import aio_pika

from infrastructure.messaging.publishers.user_events import (
    UserEventPublisher,
)
from interface.routes import router as auth_router


from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


# Replace with your frontend URL
origins = [
    "http://localhost:3000",  # Next.js dev server
    # Add your deployed frontend URL here if needed
    "http://frontend:3000",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    connection = await aio_pika.connect_robust("amqp://guest:guest@rabbitmq/")
    app.state.rabbit_connection = connection
    app.state.publisher = UserEventPublisher(connection)

    yield  # This pauses until shutdown

    # Shutdown
    await connection.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
