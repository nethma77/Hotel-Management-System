import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from routes.payment_routes import router as payment_router

_BASE_DIR = Path(__file__).resolve().parent

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


app = FastAPI(
    title="Payment Service",
    description="Hotel management payment microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_router)


@app.get("/test-payment")
def test_payment_page() -> FileResponse:
    """Simple HTML UI to create a payment intent and complete checkout with Stripe."""
    return FileResponse(_BASE_DIR / "static" / "test-payment.html")


@app.get("/")
def root():
    return {
        "message": "Payment service is running",
        "test_ui": "/test-payment",
    }
