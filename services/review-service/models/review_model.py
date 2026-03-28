from bson.objectid import ObjectId

def review_serializer(review):
    return {
        "id": str(review["_id"]),
        "customer_name": review.get("customer_name"),
        "hotel_name": review.get("hotel_name"),
        "rating": review.get("rating"),
        "comment": review.get("comment")
    }