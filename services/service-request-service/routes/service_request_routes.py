from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, status
from pymongo import DESCENDING
from bson import ObjectId

from database.db import get_service_request_collection
from models.service_request_model import (
    CreateServiceRequest,
    UpdateServiceRequest,
    ServiceRequestResponse,
)

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


def _utc_now():
    return datetime.now(timezone.utc)


def _generate_request_id():
    return f"REQ-{uuid4().hex[:8].upper()}"


def _to_response(doc):
    mongo_id = str(doc["_id"])
    return ServiceRequestResponse(
        id=mongo_id,
        request_id=doc.get("request_id", mongo_id),
        customer_id=doc.get("customer_id", ""),
        customer_name=doc.get("customer_name", ""),
        room_number=doc.get("room_number", 0),
        request_type=doc.get("request_type", ""),
        description=doc.get("description", ""),
        status=doc.get("status", "Pending"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_service_request(payload: CreateServiceRequest):
    collection = get_service_request_collection()
    now = _utc_now()

    request_doc = {
        "request_id": _generate_request_id(),
        "customer_id": payload.customer_id,
        "customer_name": payload.customer_name,
        "room_number": payload.room_number,
        "request_type": payload.request_type,
        "description": payload.description,
        "status": payload.status,
        "created_at": now,
        "updated_at": now,
    }

    inserted = collection.insert_one(request_doc)
    request_doc["_id"] = inserted.inserted_id

    return _to_response(request_doc)


@router.get("", response_model=list[ServiceRequestResponse])
def get_all_service_requests():
    collection = get_service_request_collection()
    docs = collection.find().sort("created_at", DESCENDING)
    return [_to_response(doc) for doc in docs]


@router.get("/{request_id}", response_model=ServiceRequestResponse)
def get_service_request_by_id(request_id: str):
    collection = get_service_request_collection()

    try:
        doc = collection.find_one({"_id": ObjectId(request_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    return _to_response(doc)


@router.get("/room/{room_number}", response_model=list[ServiceRequestResponse])
def get_service_requests_by_room(room_number: int):
    collection = get_service_request_collection()
    docs = collection.find({"room_number": room_number}).sort("created_at", DESCENDING)
    return [_to_response(doc) for doc in docs]


@router.put("/{request_id}", response_model=ServiceRequestResponse)
def update_service_request(request_id: str, payload: UpdateServiceRequest):
    collection = get_service_request_collection()

    try:
        existing = collection.find_one({"_id": ObjectId(request_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Service request not found")

    update_fields = {
        key: value
        for key, value in payload.model_dump(exclude_unset=True).items()
        if value is not None
    }

    update_fields["updated_at"] = _utc_now()

    collection.update_one(
        {"_id": existing["_id"]},
        {"$set": update_fields},
    )

    updated = collection.find_one({"_id": existing["_id"]})
    return _to_response(updated)


@router.delete("/{request_id}")
def delete_service_request(request_id: str):
    collection = get_service_request_collection()

    try:
        result = collection.delete_one({"_id": ObjectId(request_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service request not found")

    return {"message": "Service request deleted successfully"}
