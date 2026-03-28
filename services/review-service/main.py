from flask import Flask, request, jsonify
from bson.objectid import ObjectId
from db import reviews_collection
from model import review_serializer

app = Flask(__name__)

# ---------------- CREATE ----------------
@app.route("/reviews", methods=["POST"])
def create_review():
    data = request.json

    new_review = {
        "customer_name": data.get("customer_name"),
        "hotel_name": data.get("hotel_name"),
        "rating": data.get("rating"),
        "comment": data.get("comment")
    }

    result = reviews_collection.insert_one(new_review)
    return jsonify({
        "message": "Review created",
        "id": str(result.inserted_id)
    })


# ---------------- READ ALL ----------------
@app.route("/reviews", methods=["GET"])
def get_reviews():
    reviews = reviews_collection.find()
    return jsonify([review_serializer(r) for r in reviews])


# ---------------- READ ONE ----------------
@app.route("/reviews/<id>", methods=["GET"])
def get_review(id):
    review = reviews_collection.find_one({"_id": ObjectId(id)})

    if review:
        return jsonify(review_serializer(review))
    return jsonify({"error": "Review not found"}), 404


# ---------------- UPDATE ----------------
@app.route("/reviews/<id>", methods=["PUT"])
def update_review(id):
    data = request.json

    updated = reviews_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "customer_name": data.get("customer_name"),
            "hotel_name": data.get("hotel_name"),
            "rating": data.get("rating"),
            "comment": data.get("comment")
        }}
    )

    if updated.modified_count > 0:
        return jsonify({"message": "Review updated"})
    return jsonify({"error": "Review not found"}), 404


# ---------------- DELETE ----------------
@app.route("/reviews/<id>", methods=["DELETE"])
def delete_review(id):
    deleted = reviews_collection.delete_one({"_id": ObjectId(id)})

    if deleted.deleted_count > 0:
        return jsonify({"message": "Review deleted"})
    return jsonify({"error": "Review not found"}), 404


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)