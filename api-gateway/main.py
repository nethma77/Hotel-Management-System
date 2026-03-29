import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from config import SERVICE_MAP
from routes.gateway_routes import router as gateway_router

app = FastAPI(
    title="Hotel Management API Gateway",
    description="Single entry point for hotel management microservices.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gateway_router)


@app.get("/")
def root() -> dict:
    return {
        "message": "API Gateway is running",
        "available_services": list(SERVICE_MAP.keys()),
    }
