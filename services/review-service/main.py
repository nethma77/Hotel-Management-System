from fastapi import FastAPI, HTTPException
from database.db import reviews_collection
from models.review_model import ReviewModel
from bson import ObjectId


app = FastAPI(title="Hotel Review Service")

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Review service is running"}

# Create a review
@app.post("/reviews")
async def create_review(review: ReviewModel):
    result = reviews_collection.insert_one(review.dict())
    return {"id": str(result.inserted_id)}

# Get all reviews
@app.get("/reviews")
async def get_reviews():
    reviews = list(reviews_collection.find({}))
    for r in reviews:
        r["_id"] = str(r["_id"])
    return reviews

# Get a single review by ID
@app.get("/reviews/{review_id}")
async def get_review(review_id: str):
    review = reviews_collection.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review["_id"] = str(review["_id"])
    return review

# Update a review by ID
@app.put("/reviews/{review_id}")
async def update_review(review_id: str, review: ReviewModel):
    result = reviews_collection.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": review.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review updated successfully"}

# Delete a review by ID
@app.delete("/reviews/{review_id}")
async def delete_review(review_id: str):
    result = reviews_collection.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted successfully"}