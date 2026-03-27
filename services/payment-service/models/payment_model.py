from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    CARD = "CARD"
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"


class CreatePaymentRequest(BaseModel):
    booking_id: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="LKR", min_length=3, max_length=3)
    method: PaymentMethod = PaymentMethod.CARD


class UpdatePaymentStatusRequest(BaseModel):
    status: PaymentStatus
    transaction_ref: Optional[str] = None


class RefundPaymentRequest(BaseModel):
    reason: Optional[str] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    payment_id: str
    booking_id: str
    customer_id: str
    amount: float
    currency: str
    method: PaymentMethod
    status: PaymentStatus
    transaction_ref: Optional[str] = None
    stripe_client_secret: Optional[str] = None
    refund_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
