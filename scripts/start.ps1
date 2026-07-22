$ErrorActionPreference = "Stop"
docker compose up --build -d
Write-Host "Aguardando os serviços..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
docker compose ps
Write-Host "Execute o seed uma vez com:" -ForegroundColor Yellow
Write-Host "docker compose exec backend npm run prisma:seed"
