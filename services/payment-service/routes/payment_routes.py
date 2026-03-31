import logging
from datetime import datetime, timezone
import os
import time
from uuid import uuid4

from bson.decimal128 import Decimal128
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import ValidationError
from pymongo import DESCENDING
import stripe

from database.db import get_payments_collection
from models.payment_model import (
    CreatePaymentRequest,
    PaymentMethod,
    PaymentResponse,
    PaymentStatus,
    RefundPaymentRequest,
    SyncStripeIntentRequest,
    UpdatePaymentStatusRequest,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_amount(value) -> float:
    """MongoDB may return BSON Decimal128, int, or str; Pydantic expects float."""
    if value is None:
        raise ValueError("amount is missing")
    if isinstance(value, Decimal128):
        return float(value.to_decimal())
    return float(value)


def _to_response(doc: dict) -> PaymentResponse:
    try:
        return PaymentResponse(
            id=str(doc["_id"]),
            payment_id=str(doc["payment_id"]),
            booking_id=str(doc["booking_id"]),
            customer_id=str(doc["customer_id"]),
            amount=_coerce_amount(doc.get("amount")),
            currency=str(doc["currency"]),
            method=str(doc["method"]),
            status=str(doc["status"]),
            transaction_ref=doc.get("transaction_ref"),
            stripe_client_secret=doc.get("stripe_client_secret"),
            refund_reason=doc.get("refund_reason"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )
    except HTTPException:
        raise
    except ValidationError as exc:
        logger.exception("PaymentResponse validation failed")
        raise HTTPException(
            status_code=500,
            detail=f"Response validation failed: {exc!s}",
        ) from exc
    except Exception as exc:
        logger.exception("PaymentResponse build failed")
        raise HTTPException(
            status_code=500,
            detail=f"Invalid payment document: {type(exc).__name__}: {exc}",
        ) from exc


def _to_smallest_currency_unit(amount: float) -> int:
    # Stripe accepts an integer in the smallest unit for most currencies.
    return int(round(amount * 100))


def _find_payment_doc_for_intent(
    payments, payment_intent_id: str, metadata: dict | None
):
    pi_key = str(payment_intent_id)
    doc = payments.find_one({"transaction_ref": pi_key})
    if doc:
        return doc
    meta = metadata or {}
    pid = meta.get("payment_id")
    if pid:
        return payments.find_one({"payment_id": pid})
    return None


def _stripe_intent_status_to_db(intent_status: str) -> str | None:
    if intent_status == "succeeded":
        return PaymentStatus.SUCCESS.value
    if intent_status == "canceled":
        return PaymentStatus.FAILED.value
    return None


def _intent_metadata_as_dict(intent) -> dict:
    """Stripe metadata is a StripeObject; do not use dict() on it (can raise KeyError)."""
    raw = getattr(intent, "metadata", None)
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if hasattr(raw, "to_dict"):
        try:
            out = raw.to_dict(recursive=False)
            return dict(out) if isinstance(out, dict) else {}
        except (TypeError, ValueError, KeyError):
            pass
    data = getattr(raw, "_data", None)
    if isinstance(data, dict):
        return dict(data)
    try:
        return dict(raw)
    except (TypeError, ValueError, KeyError):
        return {}


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
            msg = str(exc)
            if "Amount must convert" in msg or "50 cents" in msg.lower():
                msg += (
                    " Stripe enforces a minimum charge (often about USD 0.50 equivalent). "
                    "Use a larger amount in this currency, or test with e.g. currency USD and amount 5.00."
                )
            raise HTTPException(
                status_code=502,
                detail=f"Stripe payment intent creation failed: {msg}",
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


@router.post("/stripe/sync-intent", response_model=PaymentResponse)
def sync_stripe_payment_intent(payload: SyncStripeIntentRequest) -> PaymentResponse:
    """Fetch PaymentIntent from Stripe and align MongoDB status (e.g. after redirect)."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Stripe is not configured. Set STRIPE_SECRET_KEY.",
        )
    try:
        intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)
    except stripe.error.InvalidRequestError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Stripe retrieve failed: {str(exc)}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error calling Stripe")
        raise HTTPException(
            status_code=502,
            detail=f"Stripe request failed: {type(exc).__name__}: {exc}",
        ) from exc

    try:
        # After redirect, Stripe can briefly report processing before succeeded.
        for _ in range(4):
            if str(getattr(intent, "status", "") or "") != "processing":
                break
            time.sleep(0.35)
            intent = stripe.PaymentIntent.retrieve(payload.payment_intent_id)

        payments = get_payments_collection()
        meta = _intent_metadata_as_dict(intent)
        pi_id = str(getattr(intent, "id", None) or payload.payment_intent_id)
        doc = _find_payment_doc_for_intent(payments, pi_id, meta)
        if not doc:
            raise HTTPException(
                status_code=404,
                detail="No payment record linked to this PaymentIntent",
            )

        if doc["status"] == PaymentStatus.REFUNDED.value:
            return _to_response(doc)

        intent_status = str(getattr(intent, "status", "") or "")
        new_status = _stripe_intent_status_to_db(intent_status)
        if new_status is None:
            return _to_response(doc)

        if doc["status"] != new_status:
            payments.update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": new_status, "updated_at": _utc_now()}},
            )
            doc = payments.find_one({"_id": doc["_id"]})
            if not doc:
                raise HTTPException(
                    status_code=500,
                    detail="Payment row missing after status update (race or DB issue)",
                )
        return _to_response(doc)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("sync_stripe_payment_intent failed")
        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc


async def _stripe_webhook_handler(request: Request) -> dict:
    """Stripe sends signed events; use for production. Configure STRIPE_WEBHOOK_SECRET."""
    wh_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not wh_secret:
        raise HTTPException(
            status_code=500,
            detail="STRIPE_WEBHOOK_SECRET is not set",
        )
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, wh_secret)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    etype = event["type"]
    if etype not in ("payment_intent.succeeded", "payment_intent.payment_failed"):
        return {"received": True}

    pi = event["data"]["object"]
    pi_id = pi["id"]
    payments = get_payments_collection()
    doc = _find_payment_doc_for_intent(payments, pi_id, pi.get("metadata") or {})
    if not doc or doc["status"] == PaymentStatus.REFUNDED.value:
        return {"received": True}

    if etype == "payment_intent.succeeded":
        new_status = PaymentStatus.SUCCESS.value
    else:
        new_status = PaymentStatus.FAILED.value

    if doc["status"] != new_status:
        payments.update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": new_status, "updated_at": _utc_now()}},
        )
    return {"received": True}


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request) -> dict:
    return await _stripe_webhook_handler(request)


@router.post("/webhook/stripe")
async def stripe_webhook_singular_alias(request: Request) -> dict:
    """Same as /webhooks/stripe (Stripe CLI often uses singular 'webhook')."""
    return await _stripe_webhook_handler(request)


@router.get("/config/public")
def get_public_payment_config() -> dict:
    return {
        "stripe_publishable_key": STRIPE_PUBLISHABLE_KEY,
    }


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
