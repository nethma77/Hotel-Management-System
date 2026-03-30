$ErrorActionPreference = "SilentlyContinue"

$ports = @(5002, 5003, 5004, 5005, 5006, 5007, 8000)

Write-Host "Stopping uvicorn processes on known service ports..." -ForegroundColor Cyan

foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen
    if ($null -eq $conns) {
        continue
    }

    foreach ($conn in $conns) {
        if ($conn.OwningProcess -gt 0) {
            Stop-Process -Id $conn.OwningProcess -Force
            Write-Host ("Stopped process {0} on port {1}" -f $conn.OwningProcess, $port) -ForegroundColor Green
        }
    }
}

Write-Host "Done." -ForegroundColor Cyan
