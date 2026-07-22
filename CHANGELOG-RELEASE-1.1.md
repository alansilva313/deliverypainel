# Release 1.1.0

- Corrigida falha de rede por porta 3010 ocupada.
- Corrigido ciclo de reinicialização do backend antes do PostgreSQL estar pronto.
- Adicionado `backend/start.sh` com 60 tentativas de conexão.
- Healthcheck do backend passou a usar `fetch` do Node.
- Portas externas agora são configuráveis.
- Adicionado `start-auto.ps1` para localizar portas livres.
- Criados volume e rede exclusivos para evitar resíduos das versões anteriores.
- Atualizada identificação da API para Release 1.1.
