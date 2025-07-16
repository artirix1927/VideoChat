from fastapi import FastAPI
from signaling import router

app = FastAPI()
app.include_router(router)
