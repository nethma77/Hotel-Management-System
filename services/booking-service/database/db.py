from pymongo import MongoClient
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set for booking-service")

client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)

db = client["booking_db"]

booking_collection = db["bookings"]
