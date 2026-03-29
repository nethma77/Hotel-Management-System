from fastapi import FastAPI
from routes import user_routes

app = FastAPI(title="User Service")

app.include_router(user_routes.router)

@app.get("/")
def root():
    return {"message": "User Service Running"}