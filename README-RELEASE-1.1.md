# Delivery Painel Release 1.1

Esta release corrige a inicialização Docker/Prisma e evita o conflito que ocorria na porta 3010.

## Inicialização automática recomendada (Windows)

```powershell
.\scripts\start-auto.ps1
```

O script procura portas livres a partir de **3011** para a API e **5181** para o painel, grava o `.env`, reconstrói os containers e mostra as URLs finais.

## Inicialização manual

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose logs -f backend
```

A primeira carga de demonstração é manual para não apagar dados em reinicializações:

```powershell
docker compose exec backend npm run prisma:seed
```

Login: `admin@demo.com` / `Admin123!`

## Correções principais

- portas configuráveis por `.env`;
- padrão alterado para API 3011 e painel 5181;
- script que procura portas livres automaticamente;
- volume PostgreSQL exclusivo desta release;
- rede Docker exclusiva;
- espera ativa e repetida pela conexão Prisma;
- `prisma db push` somente depois de o banco aceitar consultas;
- healthcheck feito pelo próprio Node, sem `wget`;
- seed não é mais executado automaticamente e não apaga dados por engano;
- diagnóstico e reinstalação limpa disponíveis em `scripts/`.

## Diagnóstico

```powershell
.\scripts\diagnostico.ps1
```
