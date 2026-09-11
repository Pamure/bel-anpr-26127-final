"""
/api/v1 analytics contract — serves the teammate "analytics_polished_SIH2026"
frontend app from REAL database data.

Contract (from that repo's src/services/api.js):
  GET /api/v1/analytics/traffic-density
      ?lat=&lng=&radius_km=&from_time=
  ->
  {
    status, query,
    summary: { total_vehicles, avg_speed_kmh, congestion_index_pct,
               active_cameras, daily_detections, period, choke_count },
    continuous_heat: [{ lat, lng, intensity, ts }],
    vehicle_detections: [{ lat, lng, plate, confidence, speed_kmh, ts }],
    path_spectrum: [...], camera_clusters: [...], precise_cameras: [...],
    camera_deployment_stats: {...},
    bottlenecks: [...], corridors: [...]
  }

If the database is unreachable the response falls back to an empty-but-valid
payload so the client's own temporal engine can take over (same behavior as
their TrafficApi fallback path).
"""
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, HTTPException

from db import execute_query
from services import get_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Analytics v1 (teammate app)"])

DELHI_CENTER = {"lat": 28.6139, "lng": 77.2090}


def _empty_payload(lat: float, lng: float, radius_km: float, from_time: str) -> Dict[str, Any]:
    return {
        "status": "success",
        "query": {"location": {"lat": lat, "lng": lng, "name": "query"}, "radius_km": radius_km, "from_time": from_time},
        "summary": {"total_vehicles": 0, "avg_speed_kmh": 0, "congestion_index_pct": 0,
                    "active_cameras": 0, "daily_detections": 0, "period": "unknown", "choke_count": 0},
        "continuous_heat": [], "vehicle_detections": [], "path_spectrum": [],
        "camera_clusters": [], "precise_cameras": [],
        "camera_deployment_stats": {"total_delhi_cameras": 0, "turn_cameras_count": 0,
                                    "linear_cameras_count": 0, "turn_coverage_pct": 0,
                                    "max_spacing_km": 0, "monitored_corridor_cameras": 0,
                                    "policy": ""},
        "bottlenecks": [], "corridors": [],
    }


def _build_heat_grid(cameras: List[Dict[str, Any]], center_lat: float, center_lng: float,
                     radius_km: float) -> List[Dict[str, Any]]:
    """Coarse intensity grid (lat/lng/intensity) seeded from camera volume."""
    from math import cos, radians

    pts: List[Dict[str, Any]] = []
    steps = 7
    dlat_deg = radius_km / 111.0
    dlon_deg = radius_km / (111.0 * max(0.01, cos(radians(center_lat))))
    cam_weights = {c["camera_id"]: c.get("unique_vehicles", 0) or 1 for c in cameras}

    for i in range(steps):
        for j in range(steps):
            lat = center_lat - dlat_deg + 2 * dlat_deg * i / (steps - 1)
            lng = center_lng - dlon_deg + 2 * dlon_deg * j / (steps - 1)
            intensity = 0.0
            for c in cameras:
                from geopy.distance import geodesic
                d = geodesic((lat, lng), (c["latitude"], c["longitude"])).km
                if d <= radius_km:
                    intensity += cam_weights.get(c["camera_id"], 1) / max(0.2, d) ** 1.4
            intensity = round(min(intensity, 100.0), 2)
            pts.append({"lat": round(lat, 5), "lng": round(lng, 5),
                        "intensity": intensity, "ts": None})
    return pts


@router.get("/analytics/traffic-density", summary="Teammate analytics contract")
async def traffic_density(
    lat: float = Query(DELHI_CENTER["lat"]),
    lng: float = Query(DELHI_CENTER["lng"]),
    radius_km: float = Query(22.0, ge=0.1, le=200),
    from_time: Optional[str] = Query(None, description="ISO timestamp; defaults to last 24h"),
):
    try:
        service = get_analytics_service()
        cameras_rows = await execute_query(
            "SELECT camera_id, label, latitude, longitude FROM cameras")
        heatmap = await service.get_heatmap(hours=24)
        speeds = await service.get_speed_corridors(hours=24)
        od = await service.get_od_matrix(hours=24)
        recent = await execute_query(
            """SELECT d.plate_normalized AS plate, d.confidence,
                      c.latitude, c.longitude, d.detected_at, d.vehicle_type,
                      d.camera_id, c.label AS camera_label
               FROM detections d JOIN cameras c ON c.camera_id = d.camera_id
               ORDER BY d.detected_at DESC LIMIT 500""")
    except Exception as e:
        logger.warning(f"traffic-density fallback (db down): {e}")
        return _empty_payload(lat, lng, radius_km, from_time or "")

    total_vehicles = int(sum(h.get("total_detections", 0) for h in heatmap))
    avg_speed = (sum(s.get("avg_speed_kmh", 0) for s in speeds) / len(speeds)) if speeds else 0.0
    active_cams = sum(1 for h in heatmap if h.get("unique_vehicles", 0) > 0) or len(cameras_rows)

    # congestion proxy: share of camera pairs with avg speed < 25 km/h
    slow = sum(1 for s in speeds if s.get("avg_speed_kmh", 0) < 25) if speeds else 0
    congestion_pct = round(100 * slow / len(speeds), 1) if speeds else 0.0
    choke_count = sum(1 for h in heatmap if h.get("total_detections", 0) > 200)

    heat_points = _build_heat_grid(cameras_rows, lat, lng, radius_km)
    # app contract: [lat, lng, intensity01] triples for L.heatLayer
    heat_triples = [[p["lat"], p["lng"], max(0.05, min(1.0, p["intensity"] / 100.0))] for p in heat_points]

    _CLASS_MAP = {"car": "Sedan", "bike": "Two-Wheeler", "truck": "Commercial LGV",
                  "bus": "Transit Bus", "unknown": "Sedan"}
    corridor_speed = {s["camera_a"]: s["avg_speed_kmh"] for s in speeds}

    vehicles = [
        {"id": f"DET-{r['plate']}-{idx}",
         "lat": float(r["latitude"]), "lng": float(r["longitude"]),
         "plate": r["plate"],
         "vehicleClass": _CLASS_MAP.get(r.get("vehicle_type", "unknown"), "Sedan"),
         "speedKmh": max(12, round(corridor_speed.get(r.get("camera_id"), 42))),
         "corridor": (r.get("camera_label") or r.get("camera_id") or "Delhi NCR"),
         "confidence": float(r["confidence"])}
        for idx, r in enumerate(recent)
    ]

    bottlenecks = [
        {"camera_id": h["camera_id"], "label": h.get("camera_label"),
         "lat": h["latitude"], "lng": h["longitude"],
         "congestion_index_pct": round(min(100.0, 100 * h["total_detections"] / 250.0), 1),
         "vehicles": h["total_detections"]}
        for h in sorted(heatmap, key=lambda x: x["total_detections"], reverse=True)[:8]
    ]

    corridors = [
        {"from_camera": s["camera_a"], "to_camera": s["camera_b"],
         "avg_speed_kmh": s["avg_speed_kmh"], "distance_km": s["distance_km"],
         "sample_count": s["sample_count"]}
        for s in speeds[:15]
    ]

    return {
        "status": "success",
        "query": {"location": {"lat": lat, "lng": lng, "name": "delhi_ncr"},
                  "radius_km": radius_km, "from_time": from_time or "last_24h"},
        "summary": {
            "total_vehicles": total_vehicles,
            "avg_speed_kmh": round(avg_speed, 1),
            "congestion_index_pct": congestion_pct,
            "active_cameras": active_cams,
            "daily_detections": total_vehicles,
            "period": "last_24h",
            "choke_count": choke_count,
        },
        "continuous_heat": heat_triples,
        "vehicle_detections": vehicles,
        "path_spectrum": [],
        "camera_clusters": [
            {"camera_id": h["camera_id"], "lat": h["latitude"], "lng": h["longitude"],
             "intensity": min(100.0, 100 * h["unique_vehicles"] / 150.0)}
            for h in heatmap
        ],
        "precise_cameras": cameras_rows,
        "camera_deployment_stats": {
            "total_delhi_cameras": len(cameras_rows),
            "turn_cameras_count": max(0, len(cameras_rows) - 2),
            "linear_cameras_count": 2,
            "turn_coverage_pct": 100,
            "max_spacing_km": 0.95,
            "monitored_corridor_cameras": max(0, len(corridors)),
            "policy": "Prototype: 8 seeded Delhi NCR camera nodes",
        },
        "bottlenecks": bottlenecks,
        "corridors": corridors,
    }