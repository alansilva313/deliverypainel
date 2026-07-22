$ErrorActionPreference = "Stop"
Write-Warning "Este comando apaga o banco local desta release."
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up -d
Start-Sleep -Seconds 15
docker compose exec backend npm run prisma:seed
docker compose ps
