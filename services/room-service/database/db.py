from pymongo import MongoClient

# 🔹 Direct MongoDB Atlas connection 
MONGO_URI = "mongodb+srv://hotel_admin:Hotel%4012345@cluster0.m30b1gb.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "rooms_db"

try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Force connection check
    client.server_info()

    # The collection we will use for Room Service orders
    room_order_collection = db["room_orders"]

    print("✅ MongoDB connected successfully")

except Exception as e:
    print("❌ MongoDB connection failed:", e)
    # Ensure this matches the variable name above
    room_order_collection = None
