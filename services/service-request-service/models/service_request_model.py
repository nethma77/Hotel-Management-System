from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CreateServiceRequest(BaseModel):
    guest_name: str
    room_number: int
    request_type: str
    description: str
    status: str = "Pending"


class UpdateServiceRequest(BaseModel):
    guest_name: Optional[str] = None
    room_number: Optional[int] = None
    request_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ServiceRequestResponse(BaseModel):
    id: str
    guest_name: str
    room_number: int
    request_type: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime