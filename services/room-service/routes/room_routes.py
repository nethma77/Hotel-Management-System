from fastapi import APIRouter, HTTPException
from database.db import room_order_collection as rooms_collection # මෙතන db එකේ නම වෙනස් නොකර variable එක විතරක් rooms විදිහට ගත්තා
from models.room_model import Room, RoomUpdate
from typing import List

router = APIRouter()


@router.post("/rooms", status_code=201)
def add_room(room: Room):
    if rooms_collection is None:
        raise HTTPException(status_code=503, detail="Database connection error")
    
 
    if rooms_collection.find_one({"room_number": room.room_number}):
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    rooms_collection.insert_one(room.model_dump())
    return {"message": f"Room {room.room_number} added successfully"}


@router.get("/rooms", response_model=List[dict])
def get_all_rooms():
    rooms = []
    for r in rooms_collection.find():
        r["_id"] = str(r["_id"])
        rooms.append(r)
    return rooms

# 🔹
@router.patch("/rooms/{room_number}")
def update_room(room_number: str, details: RoomUpdate):
    
    update_data = {k: v for k, v in details.model_dump().items() if v is not None}
    
    result = rooms_collection.update_one(
        {"room_number": room_number},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"message": f"Room {room_number} updated successfully"}

# 🔹 
@router.get("/rooms/check/{room_number}")
def check_availability(room_number: str):
    room = rooms_collection.find_one({"room_number": room_number}, {"_id": 0, "is_available": 1})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"room_number": room_number, "is_available": room["is_available"]}

# 🔹 
@router.delete("/rooms/{room_number}")
def delete_room(room_number: str):
    result = rooms_collection.delete_one({"room_number": room_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Room deleted successfully"}
