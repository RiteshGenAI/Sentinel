$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:SECRET_KEY -ErrorAction SilentlyContinue

$envFile = Join-Path $Backend '.env'
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "Env:$name" -Value $value
    }
}

Set-Location $Backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
