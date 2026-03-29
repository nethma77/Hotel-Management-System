import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://udara:udara@cluster0.jeschng.mongodb.net/?appName=Cluster0")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "hotel_management")

_client: MongoClient | None = None
_connection_checked = False
logger = logging.getLogger("payment-service.db")


def _check_connection_once(client: MongoClient) -> None:
    global _connection_checked
    if _connection_checked:
        return

    try:
        client.admin.command("ping")
        logger.info("MongoDB connected successfully to %s", MONGODB_URI)
    except Exception as exc:
        logger.warning("MongoDB connection failed to %s: %s", MONGODB_URI, exc)
    finally:
        _connection_checked = True


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        _check_connection_once(_client)
    return _client


def get_db():
    return get_client()[MONGODB_DB_NAME]


def get_payments_collection():
    return get_db()["payments"]
