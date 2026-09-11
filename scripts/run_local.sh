#!/usr/bin/env bash
# Local development launcher for BEL ANPR 26127 prototype
# Starts: PostgreSQL (docker) + Backend (uvicorn) + Frontend (vite)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PY="${BACKEND_PY:-/home/mjonir/f/sih2026/work1/anpr-env/bin/python}"
API_KEY="${API_KEY:-bel-anpr-2026-secret-key-change-in-production}"

echo "═══ BEL ANPR 26127 — Local Launcher ═══"

# 1. PostgreSQL via docker compose (isolated :5433)
if docker ps --format '{{.Names}}' | grep -q bel-prototype-db; then
    echo "✓ PostgreSQL already running (bel-prototype-db)"
else
    echo "→ Starting PostgreSQL container..."
    (cd "$ROOT" && docker compose up -d postgres)
    echo "→ Waiting for DB health..."
    for i in $(seq 1 30); do
        if docker exec bel-prototype-db pg_isready -U anpr_user -d bel_anpr >/dev/null 2>&1; then
            echo "✓ Database ready"
            break
        fi
        sleep 1
    done
fi

# 2. Backend (uvicorn on :8088)
echo "→ Starting backend on :8088 ..."
export DATABASE_URL="postgresql://anpr_user:secure_password_change_me@localhost:5433/bel_anpr"
export API_KEY="$API_KEY"
export OSRM_BASE_URL="${OSRM_BASE_URL:-http://127.0.0.1:5000}"
export OCR_ENGINE="${OCR_ENGINE:-friend}"   # friend = stub; switch to paddleocr when models available
export PYTHONPATH="$ROOT/backend/src"

if [ ! -x "$BACKEND_PY" ]; then
    echo "⚠ anpr-env python not found at $BACKEND_PY — falling back to python3"
    BACKEND_PY=python3
fi

"$BACKEND_PY" -m uvicorn main:app \
    --app-dir "$ROOT/backend/src" \
    --host 127.0.0.1 --port 8088 --reload &
BACKEND_PID=$!
echo "  backend pid: $BACKEND_PID"

# 3. Frontend (vite on :5173)
echo "→ Starting frontend on :5173 ..."
(cd "$ROOT/frontend" && [ -d node_modules ] || npm install --no-audit --no-fund)
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!
echo "  frontend pid: $FRONTEND_PID"

# Health wait
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8088/health >/dev/null 2>&1; then
        echo "✓ Backend healthy at http://127.0.0.1:8088"
        break
    fi
    sleep 1
done

echo
echo "═ UI:  http://localhost:5173  ═"
echo "═ API: http://127.0.0.1:8088/docs  ═"
echo
echo "Press Ctrl+C to stop all processes."
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM EXIT
wait