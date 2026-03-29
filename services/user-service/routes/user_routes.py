from fastapi import APIRouter
from models.user_model import User
from database.db import user_collection
import uuid

router = APIRouter()

# ✅ CREATE USER (POST)
@router.post("/users")
def create_user(user: User):
    user_dict = user.dict()
    user_dict["user_id"] = str(uuid.uuid4())

    user_collection.insert_one(user_dict)
    return {"message": "User created successfully"}

# ✅ GET ALL USERS
@router.get("/users")
def get_users():
    users = list(user_collection.find({}, {"_id": 0}))
    return users

# ✅ GET USER BY ID
@router.get("/users/{user_id}")
def get_user(user_id: str):
    user = user_collection.find_one({"user_id": user_id}, {"_id": 0})
    if user:
        return user
    return {"error": "User not found"}

# ✅ UPDATE USER (PUT)
@router.put("/users/{user_id}")
def update_user(user_id: str, user: User):
    result = user_collection.update_one(
        {"user_id": user_id},
        {"$set": user.dict()}
    )
    if result.modified_count:
        return {"message": "User updated"}
    return {"error": "User not found"}

# ✅ DELETE USER
@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    result = user_collection.delete_one({"user_id": user_id})
    if result.deleted_count:
        return {"message": "User deleted"}
    return {"error": "User not found"}