from fastapi import FastAPI
from room_routes import router as room_router

app = FastAPI(title="Room Service API")

@app.get("/")
def root():
    return {"message": "Room Service API Running"}

app.include_router(room_router)