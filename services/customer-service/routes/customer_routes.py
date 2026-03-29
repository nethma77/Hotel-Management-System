from fastapi import APIRouter, HTTPException
from db import customer_collection
from customer_model import Customer

router = APIRouter()

# Create Customer
@router.post("/customers")
def create_customer(customer: Customer):
    if customer_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    data = customer.dict()

    existing = customer_collection.find_one({"customer_id": data["customer_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Customer ID already exists")

    customer_collection.insert_one(data)

    return {
        "message": "Customer created successfully",
        "customer_id": data["customer_id"]
    }


# Get All Customers
@router.get("/customers")
def get_customers():
    if customer_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    customers = []
    for c in customer_collection.find():
        c["_id"] = str(c["_id"])
        customers.append(c)

    return customers


# Get Customer by ID
@router.get("/customers/{customer_id}")
def get_customer(customer_id: str):
    if customer_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    customer = customer_collection.find_one({"customer_id": customer_id})

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer["_id"] = str(customer["_id"])
    return customer


# Update Customer
@router.put("/customers/{customer_id}")
def update_customer(customer_id: str, customer: Customer):
    if customer_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    result = customer_collection.update_one(
        {"customer_id": customer_id},
        {"$set": customer.dict()}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {"message": "Customer updated successfully"}


# Delete Customer
@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: str):
    if customer_collection is None:
        raise HTTPException(status_code=500, detail="Database not connected")

    result = customer_collection.delete_one({"customer_id": customer_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {"message": "Customer deleted successfully"}
