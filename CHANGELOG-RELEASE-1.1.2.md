# Release 1.1.2

- Corrige `.env` com BOM no Windows PowerShell, que fazia o Compose ignorar `BACKEND_PORT` e usar 3011.
- A busca de portas ocorre após encerrar os containers da própria release.
- O script localiza dinamicamente o container do backend; não depende de nome fixo.
- Trata containers sem `Health` sem quebrar o template do `docker inspect`.
- Em caso de falha, exibe automaticamente os últimos logs do backend e encerra com erro.
- Publicação das portas limitada a 127.0.0.1 no ambiente local.
