import json
import sys
from copy import deepcopy
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from config import SERVICE_MAP
from routes.gateway_routes import router as gateway_router

HIDDEN_DOC_PATHS = {
    "payment": {
        "/test-payment",
        "/payments/webhook/stripe",
        "/payments/webhooks/stripe",
    }
}


app = FastAPI(
    title="Hotel Management API Gateway",
    description="Single entry point for hotel management microservices.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gateway_router)


def _rewrite_component_refs(item: object, service_name: str) -> object:
    if isinstance(item, dict):
        rewritten = {}
        for key, value in item.items():
            if key == "$ref" and isinstance(value, str) and value.startswith("#/components/"):
                _, _, component_type, component_name = value.split("/", 3)
                rewritten[key] = f"#/components/{component_type}/{service_name}_{component_name}"
            else:
                rewritten[key] = _rewrite_component_refs(value, service_name)
        return rewritten
    if isinstance(item, list):
        return [_rewrite_component_refs(value, service_name) for value in item]
    return item


def _merge_service_openapi(openapi_schema: dict) -> None:
    components = openapi_schema.setdefault("components", {})
    gateway_tags = {tag["name"] for tag in openapi_schema.setdefault("tags", [])}

    for service_name, service in SERVICE_MAP.items():
        try:
            with urlopen(f"{service.base_url.rstrip('/')}/openapi.json", timeout=5) as response:
                service_schema = json.loads(response.read().decode("utf-8"))
        except (OSError, URLError, json.JSONDecodeError):
            continue

        if service_name not in gateway_tags:
            openapi_schema["tags"].append(
                {
                    "name": service_name,
                    "description": f"Endpoints for the {service_name} service.",
                }
            )
            gateway_tags.add(service_name)

        for path, path_item in service_schema.get("paths", {}).items():
            if path in HIDDEN_DOC_PATHS.get(service_name, set()):
                continue

            gateway_path = f"/{service_name}{path}"
            openapi_schema["paths"][gateway_path] = _rewrite_component_refs(
                deepcopy(path_item),
                service_name,
            )

            for operation in openapi_schema["paths"][gateway_path].values():
                if isinstance(operation, dict):
                    operation["tags"] = [service_name]
                    if "operationId" in operation:
                        operation["operationId"] = f"{service_name}_{operation['operationId']}"

        for component_type, component_items in service_schema.get("components", {}).items():
            target_components = components.setdefault(component_type, {})
            for component_name, definition in component_items.items():
                target_components[f"{service_name}_{component_name}"] = _rewrite_component_refs(
                    deepcopy(definition),
                    service_name,
                )


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["tags"] = [
        {
            "name": "gateway",
            "description": "Gateway utility endpoints.",
        }
    ]
    _merge_service_openapi(openapi_schema)
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/")
def root() -> dict:
    return {
        "message": "API Gateway is running",
        "available_services": list(SERVICE_MAP.keys()),
    }
