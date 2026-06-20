# Start full stack via Docker Compose (recommended)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Write-Host '=== Starting Sentinel via Docker Compose ===' -ForegroundColor Cyan

# Ensure Docker daemon is running
try {
    docker info *> $null
} catch {
    Write-Host 'Docker is not running. Start Docker Desktop, wait until it is ready, then run this script again.' -ForegroundColor Red
    exit 1
}

Push-Location $Root
docker compose up --build
Pop-Location
