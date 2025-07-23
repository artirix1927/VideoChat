from fastapi import FastAPI
from signaling import router
from dotenv import load_dotenv
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


# Replace with your frontend URL
origins = [
    "http://localhost:3000",  # Next.js dev server
    # Add your deployed frontend URL here if needed
    "http://frontend:3000",
]


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)
