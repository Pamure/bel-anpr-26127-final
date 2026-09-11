# BEL ANPR 26127 — Working Prototype (SIH 2026)

City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics.
Team monorepo unifying: Member-1 edge ANPR (work1/anpr_app lineage), teammate OCR
(PP-OCRv5 pipeline + india_rules), trajectory/GIS frontend (TraceView lineage), fuzzy
backend (bel-anpr-backend lineage), and the polished analytics visualization app.

## Stack

| Layer | Tech | Role |
|---|---|---|
| Edge ANPR | YOLO26s vehicle det + fine-tuned plate model, ByteTrack, 8-crop buffer | `backend/src/anpr/` |
| OCR | PaddleOCR/PP-OCRv5 + EasyOCR fallback + `india_rules` (teammate) OR built-in PaddleOCR path | `backend/src/ocr/` |
| Multi-frame fusion | ICPR 2026 quality-weighted position voter | `ocr/icpr_voter.py` |
| API | FastAPI + PostGIS/pg_trgm PostgreSQL, Bearer-key auth | `backend/src/` |
| Trajectory | OSRM `/match` road snapping (chunks of 100, overlap 9) | `backend/src/services/osrm_client.py` |
| Frontend | React 18 + Leaflet (Esri dark tiles) + Chart.js | `frontend/` |
| Analytics app | Teammate polished React app (vendored) | `analytics-app/` |

## Quick start

### A. Full stack with real database (recommended — needs Docker)
```bash
cp .env.example .env          # then edit secrets
docker compose up -d --build  # postgres(:5433) + backend(:8088) + frontend(:5174? port in compose)
# UI:      http://localhost:5173   (frontend container nginx on :5174 per docker-compose)
# API docs: http://127.0.0.1:8088/docs
```

### B. Frontend-only demo (no Docker/DB needed)
```bash
cd frontend && npm install
DEMO_MODE=1 npm run dev        # serves realistic fixture API from vite.demo-mock.js
# UI: http://localhost:5173
```
Demo mode is a drop-in stand-in: same JSON contracts, real backend later. Mocked:
alerts (blacklist + impossible travel), trajectory DL3CAX1234 with OSRM route,
analytics (density/heatmap/OD/speed), 8 Delhi cameras.

### C. Analytics teammate app
```bash
cd analytics-app && npm install
npm run dev                    # rich synthetic Delhi engine out of the box
VITE_API_URL=http://127.0.0.1:8088/api/v1 npm run dev   # live real data once DB is seeded
```
Backend contract: `GET /api/v1/analytics/traffic-density` (`backend/src/routes/api_v1_analytics.py`).

## OCR engine hot-swap

Engine chosen by env `OCR_ENGINE` in `.env` / config:
- `paddleocr` — built-in single path w/ CLAHE + SR-style preprocessing
- `teammate` — vendored teammate PP-OCRv5→EasyOCR fallback + india_rules structural
  correction (`backend/src/ocr/teammate/`, adapter `ocr/teammate_engine.py`)
- `friend` — stub adapter; teammates drop their model into `ocr/friend_model.py`
  implementing `BaseOCREngine` (`recognize_single` / `recognize_track`)

Every engine returns the same `OCRResult` contract (`ocr/base.py`); track-level fusion
always runs the ICPR 2026 voter, so engines swap without touching the pipeline.

## Tests (245 backend + 19 frontend unit + live browser E2E)

```bash
# backend (pure logic; DB/OSRM-live classes skip when unavailable)
cd backend && ../work1/anpr-env/bin/python -m pytest src/tests -q

# frontend unit
cd frontend && npx vitest run tests/utils.test.js

# full run incl. browser E2E needs servers up:
bash scripts/run_all_tests.sh
```
Live browser E2E scenarios (run from `frontend/tests/browser_e2e.py`): system boot,
plate tracking, 60fps playback, threat monitor, analytics canvases — all driven in a
real browser with screenshots at each step.

## Deploy to yarmuk (safe, isolated)

```bash
bash scripts/verify_yarmuk_isolation.sh   # read-only: existing services untouched
bash scripts/deploy.sh                    # rsync → ~/bel-anpr-prototype + compose up
```
Isolation: prototype touches ONLY `~/bel-anpr-prototype` and binds `127.0.0.1:8088`
(backend) / `127.0.0.1:5433` (postgres). Existing osrm-router(:5000), sih_collab(:3000),
autoboard(:3001), nakama, ironforge are never touched; backend can query the local
New-Delhi OSRM at 127.0.0.1:5000 for <15ms map matching.

## Layout
```
backend/src/
  anpr/       detection, ByteTrack tracking, producer/consumer pipeline
  ocr/        base contract, icpr_voter, paddleocr_backend, teammate_engine, teammate/, syntax_repair
  db/         PostGIS schema, seed (8 Delhi cameras), pool + queries
  services/   osrm_client, trajectory_svc, alert_svc, analytics_svc
  routes/     detections, trajectory, blacklist, alerts, analytics, stream(MJPEG), api_v1_analytics
  tests/      test_db, test_anpr_ocr, test_trajectory, test_alerts
frontend/src/ App (Tactical Command Center), components/*, utils (osrm/trajectory/playback), icons
analytics-app/ vendored teammate analytics UI (React 19 + Leaflet.heat)
scripts/      run_local, run_all_tests, deploy, verify_yarmuk_isolation
```
