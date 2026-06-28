#!/bin/sh
# Entrypoint do backend em produção.
# Roda dentro de /app/apps/backend (WORKDIR do runner), onde:
#   - dist/main.js                 → app NestJS compilado
#   - dist/database/migrator.js    → migrator (up|down|status)
#   - drizzle/migrations/*.sql     → migrações (lidas via process.cwd())
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] RUN_MIGRATIONS=true → aplicando migrações pendentes..."
  node dist/database/migrator.js up
fi

echo "[entrypoint] iniciando o servidor..."
exec node dist/main
