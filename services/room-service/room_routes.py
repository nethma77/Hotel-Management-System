from fastapi import APIRouter, HTTPException
# Updated import to match your renamed db.py
from db import room_order_collection
# Updated import to match your renamed room_model.py
from room_model import RoomOrder, StatusUpdate

router = APIRouter()

@router.post("/room-service")
def place_order(order: RoomOrder):
    if room_order_collection is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    
    try:
        data = order.dict()
        if room_order_collection.find_one({"order_id": data["order_id"]}):
            raise HTTPException(status_code=400, detail="Order ID already exists")

        room_order_collection.insert_one(data)
        return {"message": "Order placed successfully", "order_id": data["order_id"]}
    except Exception:
        raise HTTPException(status_code=500, detail="Error saving to database")

@router.get("/room-service")
def get_orders():
    orders = []
    if room_order_collection is not None:
        for o in room_order_collection.find():
            o["_id"] = str(o["_id"])
            orders.append(o)
    return orders

@router.get("/room-service/{order_id}")
def get_order(order_id: str):
    order = room_order_collection.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["_id"] = str(order["_id"])
    return order

@router.patch("/room-service/{order_id}/status")
def update_status(order_id: str, update: StatusUpdate):
    result = room_order_collection.update_one(
        {"order_id": order_id},
        {"$set": {"status": update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": f"Status updated to {update.status}"}

@router.delete("/room-service/{order_id}")
def delete_order(order_id: str):
    result = room_order_collection.delete_one({"order_id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}