# Sentinel Fullstack - one-time setup
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Write-Host '=== Sentinel Fullstack Setup ===' -ForegroundColor Cyan

# Refresh PATH (Node may have been installed recently)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# Backend Python venv
Write-Host '[1/3] Backend dependencies...' -ForegroundColor Yellow
Push-Location (Join-Path $Root 'backend')
if (-not (Test-Path '.venv')) {
    python -m venv .venv
}
.\.venv\Scripts\python.exe -m pip install --upgrade pip -q
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -q
Pop-Location

# Frontend npm deps
Write-Host '[2/3] Frontend dependencies...' -ForegroundColor Yellow
Push-Location (Join-Path $Root 'frontend')
npm install
Pop-Location

# Ensure backend .env exists
Write-Host '[3/3] Environment file...' -ForegroundColor Yellow
$envFile = Join-Path $Root 'backend\.env'
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $Root 'backend\.env.example') $envFile
    Write-Host 'Created backend/.env from .env.example' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Setup complete!' -ForegroundColor Green
Write-Host 'Run:  .\scripts\start-docker.ps1   (recommended - uses Docker)' -ForegroundColor White
Write-Host '  or: .\scripts\start-local.ps1    (native PostgreSQL + local processes)' -ForegroundColor White
