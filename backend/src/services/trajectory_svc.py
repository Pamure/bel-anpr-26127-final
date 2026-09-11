import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from rapidfuzz.distance import Levenshtein


def lev_distance(a: str, b: str) -> int:
    """Levenshtein edit distance (rapidfuzz)."""
    return Levenshtein.distance(a, b)


from db import (
    get_trajectory_exact,
    get_trajectory_fuzzy,
)
from services.osrm_client import OSRMClient, OSRMMatchResult, points_from_detections

logger = logging.getLogger(__name__)


@dataclass
class TrajectoryPoint:
    id: int
    camera_id: str
    camera_label: Optional[str]
    latitude: float
    longitude: float
    plate_raw: str
    plate_normalized: str
    confidence: float
    vehicle_type: str
    detected_at: str
    image_ref: Optional[str] = None


@dataclass
class TrajectoryResult:
    plate: str
    mode: str  # 'exact' or 'fuzzy'
    sightings_count: int
    points: List[TrajectoryPoint]
    geojson: Dict[str, Any]
    osrm_match: Optional[OSRMMatchResult] = None


class TrajectoryService:
    """
    Spatial-temporal trajectory reconstruction with fuzzy matching and OSRM road snapping.
    """

    def __init__(self, max_edit_distance: int = 2):
        self.max_edit_distance = max_edit_distance
        self.osrm_client = OSRMClient()

    async def get_trajectory(
        self,
        plate: str,
        fuzzy: bool = False,
        include_osrm: bool = True,
    ) -> TrajectoryResult:
        """
        Get trajectory for a plate.
        
        Args:
            plate: License plate text (will be normalized)
            fuzzy: Enable fuzzy matching via pg_trgm + Levenshtein
            include_osrm: Include OSRM road-matched geometry
            
        Returns:
            TrajectoryResult with points, GeoJSON, and optional OSRM match
        """
        normalized = plate.upper().replace(' ', '').replace('-', '')

        if fuzzy:
            rows = await get_trajectory_fuzzy(normalized)
            mode = 'fuzzy'
        else:
            rows = await get_trajectory_exact(normalized)
            mode = 'exact'

        # Apply Levenshtein refinement for fuzzy results
        if fuzzy:
            rows = [
                r for r in rows
                if lev_distance(r['plate_normalized'], normalized) <= self.max_edit_distance
            ]

        # Convert to trajectory points
        points = []
        for r in rows:
            points.append(TrajectoryPoint(
                id=r['id'],
                camera_id=r['camera_id'],
                camera_label=r.get('camera_label'),
                latitude=float(r['latitude']),
                longitude=float(r['longitude']),
                plate_raw=r['plate_raw'],
                plate_normalized=r['plate_normalized'],
                confidence=float(r['confidence']),
                vehicle_type=r['vehicle_type'],
                detected_at=r['detected_at'].isoformat() if hasattr(r['detected_at'], 'isoformat') else str(r['detected_at']),
                image_ref=r.get('image_ref'),
            ))

        # Build GeoJSON FeatureCollection
        geojson = {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [p.longitude, p.latitude],
                    },
                    'properties': {
                        'id': p.id,
                        'plate': p.plate_normalized,
                        'camera': p.camera_label,
                        'camera_id': p.camera_id,
                        'detected_at': p.detected_at,
                        'confidence': p.confidence,
                        'vehicle_type': p.vehicle_type,
                        'image_ref': p.image_ref,
                    }
                }
                for p in points
            ]
        }

        # Get OSRM road matching if requested
        osrm_match = None
        if include_osrm and len(points) >= 2:
            osrm_points = points_from_detections([
                {
                    'longitude': p.longitude,
                    'latitude': p.latitude,
                    'detected_at': p.detected_at,
                }
                for p in points
            ])
            if len(osrm_points) >= 2:
                osrm_match = await self.osrm_client.match_track(osrm_points)


        # Append OSRM road geometry feature to GeoJSON for MapView
        if osrm_match and osrm_match.geometry:
            geojson['features'].append({
                'type': 'Feature',
                'geometry': osrm_match.geometry,
                'properties': {
                    'type': 'osrm_route',
                    'distance': osrm_match.distance,
                    'duration': osrm_match.duration,
                    'confidence': osrm_match.confidence,
                }
            })
        return TrajectoryResult(
            plate=normalized,
            mode=mode,
            sightings_count=len(points),
            points=points,
            geojson=geojson,
            osrm_match=osrm_match,
        )

    async def close(self):
        await self.osrm_client.close()


# Singleton instance
_trajectory_service: Optional[TrajectoryService] = None


def get_trajectory_service() -> TrajectoryService:
    global _trajectory_service
    if _trajectory_service is None:
        _trajectory_service = TrajectoryService()
    return _trajectory_service