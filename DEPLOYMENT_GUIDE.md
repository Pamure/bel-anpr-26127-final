# BEL ANPR 26127 — Deployment & Cloudflare Tunnel Runbook
**Target Host:** `yarmuk` (`mark2`, Ubuntu 6.8, Intel Core i3, 15 GiB RAM)  
**Security Policy:** Strict Zero-Touch Isolation  
**Network Ingress:** Localhost Loopback + Cloudflare Zero Trust Tunnel

---

## 1. System Architecture on Yarmuk

The prototype runs in an isolated Docker Compose project (`bel-prototype`) alongside your existing services without port collisions or file interference:

| Service | Container Name | Internal Port | Host Port | Purpose |
|---|---|---|---|---|
| **PostgreSQL + PostGIS** | `bel-prototype-db` | `5432` | `127.0.0.1:5433` | Spatial database (PostGIS 16-3.4) with GIN trigram index |
| **Edge ANPR Backend** | `bel-prototype-backend` | `8088` | `127.0.0.1:8088` | FastAPI REST engine + TensorRT/YOLO + India Rules OCR |
| **Command Center UI** | `bel-prototype-frontend` | `80` | `127.0.0.1:5174` | Nginx serving React 18 production build + reverse proxy |
| **Pre-Existing OSRM** | `osrm-router` | `5000` | `127.0.0.1:5000` | New Delhi road topology router (queried internally) |

---

## 2. Cloudflare Tunnel Integration

You can attach your custom domain to the prototype using your existing `cloudflared` setup on `yarmuk`.

### Option A: Quick Temporary Public HTTPS URL (Easiest for Demos)
Run this command in an SSH session on `yarmuk`:
```bash
cloudflared tunnel --url http://localhost:5174
```
**Output:**
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://xxxx-xxxx-xxxx.trycloudflare.com                                                  |
+--------------------------------------------------------------------------------------------+
```
This gives an instant, public `https://*.trycloudflare.com` URL that works on mobile, tablet, and projector screens anywhere in the world, with zero router configuration.

---

### Option B: Production Custom Domain via Named Cloudflare Tunnel
In your existing `~/.cloudflared/config.yml` on `yarmuk`:

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/gomango/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  # 1. Main Tactical Command Center UI
  - hostname: anpr.yourdomain.com
    service: http://localhost:5174

  # 2. Backend REST API & Live Stream
  - hostname: anpr-api.yourdomain.com
    service: http://localhost:8088

  # 3. Teammate City-Wide Analytics Dashboard (Optional)
  - hostname: anpr-analytics.yourdomain.com
    service: http://localhost:5175

  # Catch-all
  - service: http_status:404
```

Then reload the tunnel:
```bash
sudo systemctl restart cloudflared
# or
cloudflared tunnel run
```

---

## 3. SSH Local Port Forwarding (Direct Testing from Workstation)

You can forward the remote Yarmuk ports directly to your local workstation:

```bash
ssh -L 8088:127.0.0.1:8088 -L 5174:127.0.0.1:5174 yarmuk
```

Then open in your browser:
* **Tactical Command Center:** `http://localhost:5174`
* **API Documentation & OpenAPI:** `http://localhost:8088/docs`
* **Health Endpoint:** `http://localhost:8088/health`

---

## 4. Operational Commands on Yarmuk

All commands must be executed from `~/bel-anpr-prototype/`:

```bash
# Check status of prototype containers
docker compose -p bel-prototype ps

# View backend application logs
docker compose -p bel-prototype logs -f backend

# View database query logs
docker compose -p bel-prototype logs -f postgres

# Restart a specific service
docker compose -p bel-prototype restart backend

# Stop prototype stack cleanly (never touches any other server service)
docker compose -p bel-prototype down
```

---

## 5. Security & Verification Checklist

1. **Authentication:** All `/api/*` endpoints require `Authorization: Bearer bel-anpr-2026-secret-key-change-in-production`.
2. **SQL Injection:** 100% parameterized SQL queries (`$1, $2`).
3. **Isolation Guarantee:** Ports `5000` (OSRM), `3000` (sih_collab), `3001` (autoboard), `7350` (nakama), `8420` (ironforge) remain untouched.
