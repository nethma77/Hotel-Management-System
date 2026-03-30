import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("booking-service.db")

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set for booking-service")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)

db = client["booking_db"]

booking_collection = db["bookings"]

try:
    client.admin.command("ping")
    logger.info("MongoDB connected (ping ok); database=booking_db")
except Exception as exc:
    logger.warning("MongoDB connection check failed: %s", exc)
