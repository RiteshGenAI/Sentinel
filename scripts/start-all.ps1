# Start backend + frontend (requires PostgreSQL on localhost:5432)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# Load backend/.env so stale shell env vars cannot override PostgreSQL settings
$envFile = Join-Path $Root 'backend\.env'
if (Test-Path $envFile) {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:SECRET_KEY -ErrorAction SilentlyContinue
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

Write-Host '=== Starting Sentinel Fullstack (local) ===' -ForegroundColor Cyan

# Check PostgreSQL
$pgReady = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect('localhost', 5432)
    $tcp.Close()
    $pgReady = $true
} catch {}

if (-not $pgReady) {
    Write-Host 'PostgreSQL not detected. Trying Docker postgres container...' -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'start-postgres.ps1')
    Start-Sleep -Seconds 3
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('localhost', 5432)
        $tcp.Close()
        $pgReady = $true
    } catch {}
}

if (-not $pgReady) {
    Write-Host 'Cannot reach PostgreSQL on port 5432.' -ForegroundColor Red
    Write-Host 'Options:' -ForegroundColor Yellow
    Write-Host '  1. Start Docker Desktop, then run: .\scripts\start-postgres.ps1'
    Write-Host '  2. Complete PostgreSQL 17 install (set password to: postgres)'
    Write-Host '  3. Run full stack: .\scripts\start-docker.ps1'
    exit 1
}

Write-Host 'PostgreSQL: OK' -ForegroundColor Green

# Start backend
$backendDir = Join-Path $Root 'backend'
Write-Host 'Starting backend on http://localhost:8000 ...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'start-backend.ps1')
) -WindowStyle Normal

Start-Sleep -Seconds 3

# Start frontend
$frontendDir = Join-Path $Root 'frontend'
Write-Host 'Starting frontend on http://localhost:5173 ...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'start-frontend.ps1')
) -WindowStyle Normal

Write-Host ''
Write-Host 'Stack starting in separate windows.' -ForegroundColor Green
Write-Host '  App:      http://localhost:5173' -ForegroundColor White
Write-Host '  API:      http://localhost:8000' -ForegroundColor White
Write-Host '  API docs: http://localhost:8000/docs' -ForegroundColor White
Write-Host ''
Write-Host 'Register a user at login, or use the API to create an admin account.' -ForegroundColor Gray
