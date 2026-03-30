import logging
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Make local modules importable even when the app is launched outside this folder.
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)

from database.db import client as mongo_client
from routes.booking_routes import router as booking_router

app = FastAPI(
    title="Booking Service API",
    description="Handles hotel booking operations",
    version="1.0"
)

# Include router with optional prefix
app.include_router(booking_router, prefix="/booking")


@app.get("/")
def root():
    return {"message": "Booking Service is running"}


@app.get("/health")
def health():
    """Returns 200 if MongoDB responds to ping; 503 if not."""
    try:
        mongo_client.admin.command("ping")
        return {"status": "ok", "mongo": "connected"}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "mongo": "disconnected",
                "detail": str(exc),
            },
        )
