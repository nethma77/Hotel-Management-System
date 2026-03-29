from pymongo import MongoClient
from urllib.parse import quote_plus

# MongoDB credentials
username = quote_plus("hotel_admin")
password = quote_plus("Hotel@12345")
MONGO_URI = f"mongodb+srv://{username}:{password}@cluster0.m30b1gb.mongodb.net/?retryWrites=true&w=majority"

# Connect to MongoDB
client = MongoClient(MONGO_URI)

# Select your database and collection
db = client["reviewsDB"]          # database name
reviews_collection = db["reviews"]  # collection name