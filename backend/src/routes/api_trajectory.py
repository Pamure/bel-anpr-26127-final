import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from models import TrajectoryResponse
from services import get_trajectory_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/trajectory", tags=["Trajectory"])


def normalize_plate(text: str) -> str:
    return text.upper().replace(" ", "").replace("-", "")


@router.get(
    "/{plate}",
    response_model=TrajectoryResponse,
    summary="Get vehicle trajectory by plate",
)
async def get_trajectory(
    plate: str,
    fuzzy: bool = Query(False, description="Enable fuzzy matching via pg_trgm"),
    include_osrm: bool = Query(True, description="Include OSRM road-matched geometry"),
):
    """
    Get spatial-temporal trajectory for a license plate.
    
    - **exact mode** (fuzzy=false): Exact match on normalized plate, uses index
    - **fuzzy mode** (fuzzy=true): pg_trgm similarity + Levenshtein distance <= 2
    - Returns GeoJSON FeatureCollection for direct map rendering
    - Optional OSRM road-matched route geometry
    """
    normalized = normalize_plate(plate)
    
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid plate format")

    traj_service = get_trajectory_service()
    result = await traj_service.get_trajectory(
        plate=normalized,
        fuzzy=fuzzy,
        include_osrm=include_osrm,
    )

    from models import TrajectoryPoint
    
    points = [
        TrajectoryPoint(
            id=p.id,
            camera_id=p.camera_id,
            camera_label=p.camera_label,
            latitude=p.latitude,
            longitude=p.longitude,
            plate_raw=p.plate_raw,
            plate_normalized=p.plate_normalized,
            confidence=p.confidence,
            vehicle_type=p.vehicle_type,
            detected_at=p.detected_at,
            image_ref=p.image_ref,
        )
        for p in result.points
    ]

    geojson = result.geojson
    if result.osrm_match:
        geojson['features'].append({
            'type': 'Feature',
            'geometry': result.osrm_match.geometry,
            'properties': {
                'type': 'osrm_route',
                'distance_m': result.osrm_match.distance,
                'duration_s': result.osrm_match.duration,
                'confidence': result.osrm_match.confidence,
            }
        })

    return TrajectoryResponse(
        plate=result.plate,
        mode=result.mode,
        sightings_count=result.sightings_count,
        points=points,
        geojson=geojson,
    )