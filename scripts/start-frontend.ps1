# Start frontend dev server
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Set-Location (Join-Path $Root 'frontend')
npm run dev -- --host 127.0.0.1
