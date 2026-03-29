import sys
from pathlib import Path

from fastapi import FastAPI

# Make local modules importable even when the app is launched outside this folder.
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

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
