$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$services = @(
    @{
        Name = "booking-service"
        Dir = "services/booking-service"
        Port = 5002
    },
    @{
        Name = "payment-service"
        Dir = "services/payment-service"
        Port = 5003
    },
    @{
        Name = "review-service"
        Dir = "services/review-service"
        Port = 5004
    },
    @{
        Name = "service-request-service"
        Dir = "services/service-request-service"
        Port = 5005
    },
    @{
        Name = "customer-service"
        Dir = "services/customer-service"
        Port = 5006
    },
    @{
        Name = "room-service"
        Dir = "services/room-service"
        Port = 5007
    },
    @{
        Name = "api-gateway"
        Dir = "api-gateway"
        Port = 8000
    }
)

Write-Host "Starting services in separate PowerShell windows..." -ForegroundColor Cyan

foreach ($svc in $services) {
    $svcPath = Join-Path $root $svc.Dir
    if (-not (Test-Path $svcPath)) {
        throw "Service path not found: $svcPath"
    }

    $cmd = "Set-Location '$svcPath'; python -m uvicorn main:app --reload --port $($svc.Port)"

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        $cmd
    ) | Out-Null

    Write-Host ("Started {0} on port {1}" -f $svc.Name, $svc.Port) -ForegroundColor Green
}

Write-Host ""
Write-Host "All services launched." -ForegroundColor Cyan
Write-Host "Use API Gateway only: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Example payment endpoint via gateway: http://localhost:8000/payment/payments" -ForegroundColor Yellow
