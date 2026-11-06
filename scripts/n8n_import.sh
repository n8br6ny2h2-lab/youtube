#!/usr/bin/env bash
# n8n iş akışlarını içe aktarır (yerel n8n veya docker).
set -euo pipefail
cd "$(dirname "$0")/.."
if docker compose ps n8n >/dev/null 2>&1 && docker compose ps n8n | grep -q running; then
  for f in n8n/*.json; do docker compose exec -T n8n n8n import:workflow --input=/workflows/$(basename "$f"); done
  docker compose exec -T n8n n8n update:workflow --all --active=true
else
  for f in n8n/*.json; do n8n import:workflow --input="$f"; done
  n8n update:workflow --all --active=true
  echo "n8n'i başlatın: STUDIO_URL=http://127.0.0.1:8080 DASHBOARD_TOKEN=... N8N_BLOCK_ENV_ACCESS_IN_NODE=false n8n start"
fi
