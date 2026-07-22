$ErrorActionPreference = "Continue"
Write-Host "=== Docker Compose ===" -ForegroundColor Cyan
docker compose ps
Write-Host "`n=== Portas configuradas ===" -ForegroundColor Cyan
Get-Content .env -ErrorAction SilentlyContinue | Select-String 'PORT|PUBLIC_API_URL'
Write-Host "`n=== Backend (últimas 200 linhas) ===" -ForegroundColor Cyan
docker compose logs backend --tail 200
Write-Host "`n=== PostgreSQL (últimas 100 linhas) ===" -ForegroundColor Cyan
docker compose logs postgres --tail 100
