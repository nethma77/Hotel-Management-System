import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class ServiceConfig:
    name: str
    base_url: str


SERVICE_MAP = {
    "booking": ServiceConfig(
        name="booking",
        base_url=os.getenv("BOOKING_SERVICE_URL", "http://localhost:5002"),
    ),
    "payment": ServiceConfig(
        name="payment",
        base_url=os.getenv("PAYMENT_SERVICE_URL", "http://localhost:5003"),
    ),
    "review": ServiceConfig(
        name="review",
        base_url=os.getenv("REVIEW_SERVICE_URL", "http://localhost:5004"),
    ),
    "service-request": ServiceConfig(
        name="service-request",
        base_url=os.getenv("SERVICE_REQUEST_SERVICE_URL", "http://localhost:5005"),
    ),
    "customer": ServiceConfig(
        name="customer",
        base_url=os.getenv("CUSTOMER_SERVICE_URL", "http://localhost:5006"),
    ),
    "room": ServiceConfig(
        name="room",
        base_url=os.getenv("ROOM_SERVICE_URL", "http://localhost:5007"),
    ),
}
