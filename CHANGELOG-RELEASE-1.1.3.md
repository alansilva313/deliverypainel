# Release 1.1.3

- Removeu completamente a publicação da porta do backend no Windows.
- O frontend Nginx agora encaminha `/api`, `/health` e `/docs` para o backend pela rede interna do Docker.
- Apenas uma porta é publicada, eliminando conflitos recorrentes em 3010/3011.
- O script verifica a porta com `Get-NetTCPConnection` e listener exclusivo em `0.0.0.0`.
- Variáveis de processo são definidas explicitamente para impedir que valores antigos do PowerShell sobrescrevam o `.env`.
