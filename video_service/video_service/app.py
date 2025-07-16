from fastapi import FastAPI
from video_service.interface.routes import router

app = FastAPI()
app.include_router(router)
