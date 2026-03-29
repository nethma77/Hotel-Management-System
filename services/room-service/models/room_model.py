from pydantic import BaseModel, Field
from typing import Optional


class Room(BaseModel):
    room_number: str 
    room_type: str    
    price: float      
    is_available: bool = True  
    description: Optional[str] = None


class RoomUpdate(BaseModel):
    room_type: Optional[str] = None
    price: Optional[float] = None
    is_available: Optional[bool] = None
