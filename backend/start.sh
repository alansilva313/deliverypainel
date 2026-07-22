#!/bin/sh
set -eu

MAX_ATTEMPTS="${DB_CONNECT_ATTEMPTS:-60}"
ATTEMPT=1

echo "[startup] Aguardando PostgreSQL em postgres:5432..."
while ! node --input-type=module -e "import { PrismaClient } from '@prisma/client'; const p=new PrismaClient(); try { await p.\$queryRawUnsafe('SELECT 1'); await p.\$disconnect(); process.exit(0) } catch(e) { console.error(e?.message || e); await p.\$disconnect().catch(()=>{}); process.exit(1) }" >/tmp/db-check.log 2>&1; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "[startup] PostgreSQL não respondeu após $MAX_ATTEMPTS tentativas."
    cat /tmp/db-check.log || true
    exit 1
  fi
  echo "[startup] Banco ainda indisponível ($ATTEMPT/$MAX_ATTEMPTS). Nova tentativa em 2s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 2
done

echo "[startup] PostgreSQL conectado. Sincronizando schema Prisma..."
npx prisma db push --skip-generate

if [ "${AUTO_SEED:-false}" = "true" ]; then
  echo "[startup] AUTO_SEED=true: carregando dados de demonstração..."
  npm run prisma:seed
fi

echo "[startup] Schema pronto. Iniciando API..."
exec node dist/server.js
