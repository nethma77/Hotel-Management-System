from pymongo import MongoClient

MONGO_URI = "mongodb+srv://hotel_admin:Hotel@cluster0.m30b1gb.mongodb.net/hotel_db?retryWrites=true&w=majority"

client = MongoClient(MONGO_URI)
db = client["hotel_db"]

# collection
reviews_collection = db["reviews"]