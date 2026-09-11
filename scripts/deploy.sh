#!/usr/bin/env bash
# Safe deployment to yarmuk — isolated directory only: ~/bel-anpr-prototype/
# Zero-touch policy: never modifies ~/osrm, ~/sih-collab, ~/autoboard, ~/ironforge
set -euo pipefail

YARMUK="${YARMUK:-yarmuk}"
REMOTE_DIR="~/bel-anpr-prototype"
LOCAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "═══ BEL ANPR 26127 — Yarmuk Safe Deploy ═══"
echo "Target: $YARMUK:$REMOTE_DIR"
echo "Local : $LOCAL_ROOT"

# 1. Pre-deploy isolation verification
echo ""
echo "▶ 1/4 Pre-deploy isolation check..."
bash "$LOCAL_ROOT/scripts/verify_yarmuk_isolation.sh" || {
    echo "✗ Isolation check FAILED — aborting deploy."
    exit 1
}

# 2. Rsync (excludes build artifacts + secrets)
echo ""
echo "▶ 2/4 Syncing to $REMOTE_DIR (rsync)..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '*/node_modules' \
    --exclude '.git' \
    --exclude '*/.git' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude 'dist' \
    --exclude '*/dist' \
    --exclude '*.engine' \
    --exclude '*.pt' \
    "$LOCAL_ROOT/" "$YARMUK:$REMOTE_DIR/"
echo "  ✓ sync complete"

# 3. Remote compose up (isolated ports 8088/5433 only)
echo ""
echo "▶ 3/4 Remote docker compose up..."
ssh "$YARMUK" "cd $REMOTE_DIR && docker compose -p bel-prototype up -d --build 2>&1 | tail -20"

# 4. Health verification
echo ""
echo "▶ 4/4 Remote health verification..."
for i in $(seq 1 20); do
    if ssh "$YARMUK" "curl -sf http://127.0.0.1:8088/health" >/dev/null 2>&1; then
        echo "  ✓ Backend healthy at http://127.0.0.1:8088 (via tunnel)"
        break
    fi
    if [ "$i" -eq 20 ]; then
        echo "  ✗ Backend did not become healthy — check logs:"
        ssh "$YARMUK" "cd $REMOTE_DIR && docker compose -p bel-prototype logs --tail=50 backend"
        exit 1
    fi
    sleep 3
done

echo ""
echo "✅ Deploy complete. Existing services untouched."
echo "   Access via SSH tunnel: ssh -L 8088:127.0.0.1:8088 -L 5174:127.0.0.1:5174 $YARMUK"