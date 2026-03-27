from datetime import datetime, timezone
import os
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pymongo import DESCENDING
import stripe

from database.db import get_payments_collection
from models.payment_model import (
    CreatePaymentRequest,
    PaymentMethod,
    PaymentResponse,
    PaymentStatus,
    RefundPaymentRequest,
    UpdatePaymentStatusRequest,
)


router = APIRouter(prefix="/payments", tags=["payments"])
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_response(doc: dict) -> PaymentResponse:
    return PaymentResponse(
        id=str(doc["_id"]),
        payment_id=doc["payment_id"],
        booking_id=doc["booking_id"],
        customer_id=doc["customer_id"],
        amount=doc["amount"],
        currency=doc["currency"],
        method=doc["method"],
        status=doc["status"],
        transaction_ref=doc.get("transaction_ref"),
        stripe_client_secret=doc.get("stripe_client_secret"),
        refund_reason=doc.get("refund_reason"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def _to_smallest_currency_unit(amount: float) -> int:
    # Stripe accepts an integer in the smallest unit for most currencies.
    return int(round(amount * 100))


@router.on_event("startup")
def ensure_indexes() -> None:
    try:
        payments = get_payments_collection()
        payments.create_index("payment_id", unique=True)
        payments.create_index("booking_id")
        payments.create_index([("created_at", DESCENDING)])
    except Exception:
        # Keep service bootable even if MongoDB is temporarily unavailable.
        pass


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(payload: CreatePaymentRequest) -> PaymentResponse:
    payments = get_payments_collection()
    now = _utc_now()
    payment_id = f"PAY-{uuid4().hex[:12].upper()}"
    transaction_ref = None
    stripe_client_secret = None

    if payload.method == PaymentMethod.CARD:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
            )
        try:
            intent = stripe.PaymentIntent.create(
                amount=_to_smallest_currency_unit(payload.amount),
                currency=payload.currency.lower(),
                automatic_payment_methods={"enabled": True},
                metadata={
                    "booking_id": payload.booking_id,
                    "customer_id": payload.customer_id,
                    "payment_id": payment_id,
                },
            )
            transaction_ref = intent.id
            stripe_client_secret = intent.client_secret
        except stripe.error.StripeError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Stripe payment intent creation failed: {str(exc)}",
            ) from exc

    payment_doc = {
        "payment_id": payment_id,
        "booking_id": payload.booking_id,
        "customer_id": payload.customer_id,
        "amount": payload.amount,
        "currency": payload.currency.upper(),
        "method": payload.method.value,
        "status": PaymentStatus.PENDING.value,
        "transaction_ref": transaction_ref,
        "stripe_client_secret": stripe_client_secret,
        "refund_reason": None,
        "created_at": now,
        "updated_at": now,
    }
    inserted = payments.insert_one(payment_doc)
    payment_doc["_id"] = inserted.inserted_id
    return _to_response(payment_doc)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_by_payment_id(payment_id: str) -> PaymentResponse:
    payments = get_payments_collection()
    doc = payments.find_one({"payment_id": payment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Payment not found")
    return _to_response(doc)


@router.get("/booking/{booking_id}", response_model=list[PaymentResponse])
def list_payments_by_booking_id(booking_id: str) -> list[PaymentResponse]:
    payments = get_payments_collection()
    docs = payments.find({"booking_id": booking_id}).sort("created_at", DESCENDING)
    return [_to_response(doc) for doc in docs]


@router.patch("/{payment_id}/status", response_model=PaymentResponse)
def update_payment_status(
    payment_id: str, payload: UpdatePaymentStatusRequest
) -> PaymentResponse:
    payments = get_payments_collection()
    existing = payments.find_one({"payment_id": payment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")

    if existing["status"] == PaymentStatus.REFUNDED.value:
        raise HTTPException(
            status_code=400, detail="Refunded payments cannot change status"
        )

    update_doc = {
        "status": payload.status.value,
        "updated_at": _utc_now(),
    }
    if payload.transaction_ref:
        update_doc["transaction_ref"] = payload.transaction_ref

    payments.update_one({"_id": existing["_id"]}, {"$set": update_doc})
    updated = payments.find_one({"_id": existing["_id"]})
    return _to_response(updated)


@router.post("/{payment_id}/refund", response_model=PaymentResponse)
def refund_payment(payment_id: str, payload: RefundPaymentRequest) -> PaymentResponse:
    payments = get_payments_collection()
    existing = payments.find_one({"payment_id": payment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")

    if existing["status"] != PaymentStatus.SUCCESS.value:
        raise HTTPException(
            status_code=400, detail="Only successful payments can be refunded"
        )

    if existing["method"] == "CARD":
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
            )
        if not existing.get("transaction_ref"):
            raise HTTPException(
                status_code=400,
                detail="Missing Stripe transaction reference for this payment",
            )

        try:
            refund_payload = {"payment_intent": existing["transaction_ref"]}
            if payload.reason:
                refund_payload["metadata"] = {"reason": payload.reason}
            stripe.Refund.create(**refund_payload)
        except stripe.error.StripeError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Stripe refund failed: {str(exc)}",
            ) from exc

    payments.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "status": PaymentStatus.REFUNDED.value,
                "refund_reason": payload.reason,
                "updated_at": _utc_now(),
            }
        },
    )
    updated = payments.find_one({"_id": existing["_id"]})
    return _to_response(updated)


@router.get("/health/check")
def health_check() -> dict:
    return {"service": "payment-service", "status": "ok"}
