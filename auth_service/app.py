from fastapi import FastAPI
from contextlib import asynccontextmanager
import aio_pika

from infrastructure.messaging.publishers.user_events import UserEventPublisher
from interface.routes import router as auth_router


from fastapi.middleware.cors import CORSMiddleware

# Replace with your frontend URL
origins = [
    "http://localhost:3000",  # Next.js dev server
    # Add your deployed frontend URL here if needed
]


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


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Needed for cookies/auth headers
    allow_methods=["*"],
    allow_headers=["*"],
)
