# Start full stack natively (PostgreSQL on localhost + backend + frontend)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Write-Host '=== Starting Sentinel (local mode) ===' -ForegroundColor Cyan

# Check PostgreSQL
$pgReady = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect('localhost', 5432)
    $tcp.Close()
    $pgReady = $true
} catch {}

if (-not $pgReady) {
    Write-Host 'PostgreSQL is not running on port 5432.' -ForegroundColor Red
    Write-Host 'Either start PostgreSQL service, or use: .\scripts\start-docker.ps1' -ForegroundColor Yellow
    exit 1
}

Write-Host 'PostgreSQL: OK' -ForegroundColor Green
Write-Host ''
Write-Host 'Open TWO terminals and run:' -ForegroundColor Yellow
Write-Host "  Terminal 1: cd `"$Root\backend`" ; .\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000"
Write-Host "  Terminal 2: cd `"$Root\frontend`" ; npm run dev"
Write-Host ''
Write-Host 'Then open: http://localhost:5173' -ForegroundColor Green
Write-Host 'API docs:  http://localhost:8000/docs' -ForegroundColor Green
