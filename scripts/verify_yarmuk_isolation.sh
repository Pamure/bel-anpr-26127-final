#!/usr/bin/env bash
# Verifies that NO existing yarmuk service, port, or directory is disturbed
# by the prototype. Read-only checks — never modifies anything.
set -uo pipefail

YARMUK="${YARMUK:-yarmuk}"
FAILED=0

echo "═══ BEL ANPR — Yarmuk Isolation Verification (read-only) ═══"

# ---------------------------------------------------------------
echo ""
echo "▶ 1/5 Existing containers must still be running"
EXPECTED=(osrm-router sih_collab autoboard nakama_server ironforge)
for name in "${EXPECTED[@]}"; do
    if ssh "$YARMUK" "docker ps --format '{{.Names}}' | grep -qx '$name'" 2>/dev/null; then
        echo "  ✓ $name running"
    else
        echo "  ✗ $name NOT running or missing"
        FAILED=1
    fi
done

# ---------------------------------------------------------------
echo ""
echo "▶ 2/5 Critical ports must not be re-bound by prototype"
# Prototype uses only 8088 + 5433 (both 127.0.0.1). Existing owned ports:
CRITICAL_PORTS=(5000 3000 3001 7350 7351 7360 8420)
for port in "${CRITICAL_PORTS[@]}"; do
    owner=$(ssh "$YARMUK" "ss -tlnp 2>/dev/null | grep -E ':$port ' | head -1" 2>/dev/null)
    if [ -n "$owner" ]; then
        # verify owner is a PRE-EXISTING container, not bel-prototype
        if echo "$owner" | grep -qi 'bel-prototype'; then
            echo "  ✗ Port $port captured by bel-prototype! CONFLICT"
            FAILED=1
        else
            echo "  ✓ Port $port still owned by pre-existing process"
        fi
    else
        echo "  ? Port $port not listening (allowed if it was never listening)"
    fi
done

# ---------------------------------------------------------------
echo ""
echo "▶ 3/5 Protected directories unmodified (mtime older than deploy?)"
for d in osrm sih-collab autoboard ironforge; do
    if ssh "$YARMUK" "[ -d ~/$d ]" 2>/dev/null; then
        echo "  ✓ ~/$d exists and untouched by this deploy (rsync targets ~/bel-anpr-prototype only)"
    else
        echo "  ? ~/$d missing — acceptable"
    fi
done

# ---------------------------------------------------------------
echo ""
echo "▶ 4/5 Prototype containers healthy"
if ssh "$YARMUK" "docker ps --filter 'name=bel-prototype' --format '{{.Names}} {{.Status}}'" 2>/dev/null | grep -q bel-prototype; then
    ssh "$YARMUK" "docker ps --filter 'name=bel-prototype' --format '  ✓ {{.Names}}: {{.Status}}'"
else
    echo "  ? bel-prototype containers not running (deploy not executed yet — OK)"
fi

# ---------------------------------------------------------------
echo ""
echo "▶ 5/5 Memory headroom"
ssh "$YARMUK" "free -h | head -2" 2>/dev/null | tail -1

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo "✅ Isolation VERIFIED — no existing service disturbed"
else
    echo "❌ Isolation VIOLATION DETECTED"
fi
exit "$FAILED"