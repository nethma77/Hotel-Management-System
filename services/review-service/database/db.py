import logging
from urllib.parse import quote_plus

from pymongo import MongoClient

logger = logging.getLogger("review-service.db")

# MongoDB credentials
username = quote_plus("hotel_admin")
password = quote_plus("Hotel@12345")
MONGO_URI = f"mongodb+srv://{username}:{password}@cluster0.m30b1gb.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

db = client["reviewsDB"]
reviews_collection = db["reviews"]

try:
    client.admin.command("ping")
    logger.info("MongoDB connected (ping ok); database=reviewsDB")
except Exception as exc:
    logger.warning("MongoDB connection check failed: %s", exc)