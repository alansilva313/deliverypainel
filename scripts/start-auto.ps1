$ErrorActionPreference = "Stop"

function Test-PortFree([int]$Port) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) { return $false }
    } catch {}

    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Server.ExclusiveAddressUse = $true
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($null -ne $listener) {
            try { $listener.Stop() } catch {}
        }
    }
}

function Find-FreePort([int]$StartPort) {
    for ($port = $StartPort; $port -le 65535; $port++) {
        if (Test-PortFree $port) { return $port }
    }
    throw "Nenhuma porta TCP livre foi encontrada."
}

Write-Host "Encerrando containers anteriores desta release..." -ForegroundColor DarkGray
docker compose down --remove-orphans 2>$null | Out-Host

$frontendPort = Find-FreePort 5181
$env:FRONTEND_PORT = "$frontendPort"

$envContent = @"
FRONTEND_PORT=$frontendPort
POSTGRES_DB=fogo_delivery
POSTGRES_USER=fogo
POSTGRES_PASSWORD=fogo_dev_password
JWT_SECRET=troque-esta-chave-em-producao
AUTO_SEED=false
"@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env"), $envContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "Porta do sistema selecionada: $frontendPort" -ForegroundColor Cyan
Write-Host "O backend não publica mais uma porta própria; ele é acessado pelo proxy do frontend." -ForegroundColor DarkGray

Write-Host "Construindo e iniciando os containers..." -ForegroundColor Yellow
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw "O Docker Compose não conseguiu iniciar os containers."
}

Write-Host "Aguardando o backend ficar saudável..." -ForegroundColor Yellow
$healthy = $false
for ($i = 1; $i -le 90; $i++) {
    $containerId = (docker compose ps -q backend 2>$null | Select-Object -First 1).Trim()
    if ($containerId) {
        $state = docker inspect --format '{{.State.Status}}' $containerId 2>$null
        $health = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $containerId 2>$null
        if ($state -eq 'running' -and $health -eq 'healthy') {
            $healthy = $true
            break
        }
        if ($state -eq 'exited' -or $state -eq 'dead') { break }
    }
    Start-Sleep -Seconds 2
}

if (-not $healthy) {
    Write-Host "`nO backend não ficou saudável. Últimos logs:" -ForegroundColor Red
    docker compose logs backend --tail 200
    Write-Host "`nEstado atual:" -ForegroundColor Yellow
    docker compose ps
    exit 1
}

docker compose ps
Write-Host "`nSistema iniciado com sucesso." -ForegroundColor Green
Write-Host "Painel: http://localhost:$frontendPort" -ForegroundColor Green
Write-Host "Loja:   http://localhost:$frontendPort/loja" -ForegroundColor Green
Write-Host "API:    http://localhost:$frontendPort/api" -ForegroundColor Green
Write-Host "Health: http://localhost:$frontendPort/health" -ForegroundColor Green
Write-Host "Docs:   http://localhost:$frontendPort/docs" -ForegroundColor Green
Write-Host "Para carregar a demonstração uma vez: docker compose exec backend npm run prisma:seed" -ForegroundColor Yellow
