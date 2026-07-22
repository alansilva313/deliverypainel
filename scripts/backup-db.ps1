$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path backups | Out-Null
docker compose exec -T postgres pg_dump -U fogo fogo_delivery | Out-File -Encoding utf8 "backups/fogo-$stamp.sql"
Write-Host "Backup criado em backups/fogo-$stamp.sql"
