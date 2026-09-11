#!/usr/bin/env bash
# Runs ALL test suites for BEL ANPR 26127 prototype
#  1. Backend pure-logic tests (DB-backed skipped when unavailable)
#  2. Frontend unit tests (vitest)
#  3. Frontend browser E2E (requires servers running — see run_local.sh)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PY="${BACKEND_PY:-/home/mjonir/f/sih2026/work1/anpr-env/bin/python}"
FAILED=0

echo "════════════════════════════════════════════"
echo " BEL ANPR 26127 — Full Test Run"
echo "════════════════════════════════════════════"

# ---------------------------------------------------------------
echo ""
echo "▶ 1/3 Backend test suites (pytest)"
echo "--------------------------------------------------------------"
(cd "$ROOT/backend" && "$BACKEND_PY" -m pytest src/tests/ -v --tb=short) \
    || FAILED=1

# ---------------------------------------------------------------
echo ""
echo "▶ 2/3 Frontend unit tests (vitest)"
echo "--------------------------------------------------------------"
if [ -d "$ROOT/frontend/node_modules" ]; then
    (cd "$ROOT/frontend" && npm test -- --run) || FAILED=1
else
    echo "⚠ node_modules missing — run: cd frontend && npm install"
    FAILED=1
fi

# ---------------------------------------------------------------
echo ""
echo "▶ 3/3 Browser E2E (live UI workflows)"
echo "--------------------------------------------------------------"
echo "Requires: backend :8088 + frontend :5173 running (scripts/run_local.sh)"
if curl -sf http://127.0.0.1:8088/health >/dev/null 2>&1 \
   && curl -sf http://127.0.0.1:5173 >/dev/null 2>&1; then
    "$BACKEND_PY" "$ROOT/frontend/tests/browser_e2e.py" || FAILED=1
else
    echo "⚠ Servers not running — browser E2E skipped (run run_local.sh first)"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo "✅ ALL TEST SUITES PASSED"
else
    echo "❌ ONE OR MORE SUITES FAILED"
fi
exit "$FAILED"