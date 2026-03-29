from fastapi import FastAPI
from routes.service_request_routes import router

app = FastAPI(title="Service Request Service")
    
@app.get("/")
def root():
    return {"message": "Service Request Service is running"}


app.include_router(router)