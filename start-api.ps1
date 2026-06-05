# Start GST Platform API on http://localhost:5253
$ErrorActionPreference = "Stop"
$apiPath = Join-Path $PSScriptRoot "backend\GstPlatform.Api"

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:5253"

Write-Host "Starting API at http://localhost:5253" -ForegroundColor Cyan
Write-Host "Swagger: http://localhost:5253/swagger" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n"

Set-Location $apiPath
dotnet run --launch-profile http
