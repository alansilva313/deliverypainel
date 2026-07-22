@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0publicar-git.ps1" -Mensagem "Atualizacao automatica do Delivery Painel"
pause
