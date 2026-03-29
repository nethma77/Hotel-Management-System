from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

class OrderItem(BaseModel):
    item_id: str
    quantity: int

class RoomOrder(BaseModel):
    order_id: str
    room_number: str
    booking_id: str
    customer_id: str
    items: List[OrderItem]
    total_amount: float
    status: str = "PENDING"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StatusUpdate(BaseModel):
    status: str