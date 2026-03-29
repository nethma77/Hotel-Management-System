import os
import logging
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "service_request_db")

_client: MongoClient | None = None
_connection_checked = False
logger = logging.getLogger("service-request-service.db")


def _check_connection_once(client: MongoClient) -> None:
    global _connection_checked

    if _connection_checked:
        return

    try:
        client.admin.command("ping")
        logger.info("MongoDB connected successfully.")
        print("MongoDB Atlas connected successfully!")
    except Exception as exc:
        logger.warning("MongoDB connection failed: %s", exc)
        print("MongoDB connection error:", exc)
    finally:
        _connection_checked = True


def get_client() -> MongoClient:
    global _client

    if _client is None:
        if not MONGODB_URL:
            raise ValueError("MONGODB_URL is not set in the .env file")

        _client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        _check_connection_once(_client)

    return _client


def get_db():
    return get_client()[MONGODB_DB_NAME]


def get_service_request_collection():
    return get_db()["service_request"]