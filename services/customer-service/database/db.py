from pymongo import MongoClient

# 🔹 Direct MongoDB Atlas connection 

MONGO_URI = "mongodb+srv://hotel_admin:Hotel%4012345@cluster0.m30b1gb.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "hotel_db"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Force connection check
    client.server_info()

    customer_collection = db["customers"]

    print("✅ MongoDB connected successfully")

except Exception as e:
    print("❌ MongoDB connection failed:", e)
    customer_collection = None
