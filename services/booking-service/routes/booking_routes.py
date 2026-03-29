# booking_routes.py
from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from pymongo import DESCENDING
from pydantic import ValidationError

from models.booking_model import Booking, BookingDetails, BookingUpdate, BookingWriteResponse
from database.db import booking_collection

router = APIRouter()


def serialize_booking(booking: dict | None) -> dict | None:
    if not booking:
        return None

    serialized = dict(booking)
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])
    return serialized


@router.post(
    "/bookings",
    response_model=BookingWriteResponse,
    summary="Create a booking",
    description="Create a new booking and return the saved booking details.",
)
def create_booking(booking: Booking):
    booking_dict = jsonable_encoder(booking)
    result = booking_collection.insert_one(booking_dict.copy())
    created_booking = {"_id": str(result.inserted_id), **booking_dict}
    return {
        "message": "Booking created successfully",
        "booking": created_booking,
    }

@router.get(
    "/bookings",
    response_model=list[BookingDetails],
    summary="List bookings",
    description="Return all saved bookings.",
)
def get_all_bookings():
    bookings = [
        serialize_booking(booking)
        for booking in booking_collection.find({}).sort("_id", DESCENDING)
    ]
    return bookings

@router.get(
    "/bookings/by-user/{user_id}",
    response_model=BookingDetails,
    summary="Get booking by user id",
    description="Fetch a booking using the user_id field.",
)
def get_booking(user_id: str):
    booking = serialize_booking(booking_collection.find_one({"user_id": user_id}))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get(
    "/bookings/{booking_id}",
    response_model=BookingDetails,
    summary="Get booking by booking id",
    description="Fetch the existing booking details for a booking_id. This endpoint reads data and does not update anything.",
)
def get_booking_by_id(booking_id: str):
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking id")

    booking = serialize_booking(
        booking_collection.find_one({"_id": ObjectId(booking_id)})
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.put(
    "/bookings/{booking_id}",
    response_model=BookingWriteResponse,
    summary="Update booking by booking id",
    description="Update an existing booking. This endpoint does not auto-fill current values from the booking_id; it saves the values you send in the request body and returns the updated booking.",
)
def update_booking(booking_id: str, payload: BookingUpdate):
    if not ObjectId.is_valid(booking_id):
        raise HTTPException(status_code=400, detail="Invalid booking id")

    existing_booking = booking_collection.find_one({"_id": ObjectId(booking_id)})
    if not existing_booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    merged_booking = {
        "user_id": existing_booking.get("user_id"),
        "room_id": existing_booking.get("room_id"),
        "check_in": existing_booking.get("check_in"),
        "check_out": existing_booking.get("check_out"),
        "total_price": existing_booking.get("total_price"),
        **update_data,
    }

    try:
        validated_booking = Booking(**merged_booking)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    booking_dict = jsonable_encoder(validated_booking)
    booking_collection.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": booking_dict},
    )

    updated_booking = serialize_booking(
        booking_collection.find_one({"_id": ObjectId(booking_id)})
    )
    return {
        "message": "Booking updated successfully",
        "booking": updated_booking,
    }

@router.delete("/bookings/{user_id}")
def delete_booking(user_id: str):
    result = booking_collection.delete_one({"user_id": user_id})
    if result.deleted_count:
        return {"message": "Booking deleted"}
    return {"error": "Booking not found"}
