from fastapi import FastAPI
from routes.customer_routes import router

app = FastAPI(title="Customer Service API")

# Root endpoint
@app.get("/")
def root():
    return {"message": "Customer Service Running"}

# Include routes
app.include_router(router)
