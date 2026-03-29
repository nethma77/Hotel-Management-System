from pydantic import BaseModel

class Booking(BaseModel):
    user_id: str
    room_id: str
    check_in: str
    check_out: str
    status: str = "confirmed"