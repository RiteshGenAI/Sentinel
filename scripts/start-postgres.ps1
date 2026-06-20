# Run only PostgreSQL in Docker (for local dev without full docker-compose)
$ErrorActionPreference = 'Stop'
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Write-Host 'Starting PostgreSQL container...' -ForegroundColor Cyan

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker is not running. Start Docker Desktop first.' -ForegroundColor Red
    exit 1
}

$existing = docker ps -a --filter name=sentinel-postgres --format '{{.Names}}' 2>$null
if ($existing -eq 'sentinel-postgres') {
    docker start sentinel-postgres | Out-Null
} else {
    docker run -d --name sentinel-postgres `
        -e POSTGRES_DB=sentinel `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres `
        -p 5432:5432 `
        postgres:16 | Out-Null
}

Write-Host 'Waiting for PostgreSQL to accept connections...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('localhost', 5432)
        $tcp.Close()
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host 'PostgreSQL is ready on localhost:5432' -ForegroundColor Green
} else {
    Write-Host 'PostgreSQL container started but port not ready yet. Wait a few seconds.' -ForegroundColor Yellow
}
