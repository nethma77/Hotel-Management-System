from pydantic import BaseModel, EmailStr
from typing import Optional

class Customer(BaseModel):
    customer_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None