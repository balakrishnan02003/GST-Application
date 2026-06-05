# Start React frontend on http://localhost:5173
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "frontend")
Write-Host "Starting frontend at http://localhost:5173" -ForegroundColor Green
npm run dev
