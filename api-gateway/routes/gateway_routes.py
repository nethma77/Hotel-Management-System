from urllib.parse import urljoin
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter, HTTPException, Request, Response

from config import SERVICE_MAP

router = APIRouter(tags=["gateway"])

SUPPORTED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]


def _check_service_status(service_name: str, base_url: str) -> dict:
    request = UrlRequest(
        url=f"{base_url.rstrip('/')}/",
        method="GET",
        headers={"Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=5) as upstream_response:
            return {
                "name": service_name,
                "url": base_url,
                "status": "live",
                "status_code": upstream_response.status,
            }
    except HTTPError as exc:
        return {
            "name": service_name,
            "url": base_url,
            "status": "live",
            "status_code": exc.code,
        }
    except URLError:
        return {
            "name": service_name,
            "url": base_url,
            "status": "offline",
            "status_code": None,
        }


async def _forward_request(service_name: str, path: str, request: Request) -> Response:
    service = SERVICE_MAP.get(service_name)
    if not service:
        raise HTTPException(status_code=404, detail="Unknown service")

    target_url = urljoin(f"{service.base_url.rstrip('/')}/", path.lstrip("/"))
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }
    body = await request.body()

    query_string = str(request.query_params)
    if query_string:
        target_url = f"{target_url}?{query_string}"

    upstream_request = UrlRequest(
        url=target_url,
        data=body if body else None,
        headers=headers,
        method=request.method,
    )

    try:
        with urlopen(upstream_request, timeout=30) as upstream_response:
            response_body = upstream_response.read()
            status_code = upstream_response.status
            upstream_headers = dict(upstream_response.headers.items())
    except HTTPError as exc:
        response_body = exc.read()
        status_code = exc.code
        upstream_headers = dict(exc.headers.items())
    except URLError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"{service_name} service is unavailable",
        ) from exc

    response_headers = {
        key: value
        for key, value in upstream_headers.items()
        if key.lower() not in {"content-encoding", "transfer-encoding", "connection"}
    }
    return Response(
        content=response_body,
        status_code=status_code,
        headers=response_headers,
        media_type=upstream_headers.get("content-type"),
    )


@router.get("/services")
def list_services() -> dict:
    return {
        "services": {
            name: config.base_url
            for name, config in SERVICE_MAP.items()
        }
    }


@router.get("/services/status")
def list_service_status() -> dict:
    services = [
        _check_service_status(name, config.base_url)
        for name, config in SERVICE_MAP.items()
    ]
    live_count = sum(service["status"] == "live" for service in services)

    return {
        "services": services,
        "summary": {
            "total": len(services),
            "live": live_count,
            "offline": len(services) - live_count,
        },
    }


@router.api_route(
    "/{service_name}/{path:path}",
    methods=SUPPORTED_METHODS,
    summary="Proxy request to downstream service",
)
async def proxy_request(service_name: str, path: str, request: Request) -> Response:
    return await _forward_request(service_name, path, request)
