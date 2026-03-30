import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from database.db import get_db

    get_db()
    yield


app = FastAPI(title="Service Request Service", lifespan=lifespan)


@app.get("/")
def root():
    return {"message": "Service Request Service is running"}


@app.get("/health")
def health():
    """Returns 200 if MongoDB responds to ping; 503 if not."""
    from database.db import get_client

    try:
        get_client().admin.command("ping")
        return {"status": "ok", "mongo": "connected"}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "mongo": "disconnected",
                "detail": str(exc),
            },
        )


from routes.service_request_routes import router

app.include_router(router)