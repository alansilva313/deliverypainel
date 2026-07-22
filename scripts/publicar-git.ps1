param(
  [string]$Mensagem = "Atualizacao do Delivery Painel",
  [switch]$SemBuild
)
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path "$PSScriptRoot\..")
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git nao esta instalado." }
if (-not (Test-Path ".git")) { git init; git branch -M main }
$remote = git remote get-url origin 2>$null
if (-not $remote) { git remote add origin "https://github.com/alansilva313/deliverypainel.git" }
elseif ($remote -ne "https://github.com/alansilva313/deliverypainel.git") { git remote set-url origin "https://github.com/alansilva313/deliverypainel.git" }
if (-not $SemBuild) {
  docker compose build
  if ($LASTEXITCODE -ne 0) { throw "O build falhou. Nada foi enviado ao GitHub." }
}
git add .
$changes = git status --porcelain
if (-not $changes) { Write-Host "Nenhuma alteracao para publicar."; exit 0 }
git commit -m $Mensagem
git push -u origin main
Write-Host "Projeto publicado com sucesso." -ForegroundColor Green
