import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from db import (
    check_blacklist,
    insert_detection,
)
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class Alert:
    alert_type: str
    plate_normalized: str
    detection_id: int
    details: Dict[str, Any]


class AlertService:
    """
    Real-time alert engine for blacklist matches and impossible travel anomalies.
    """

    def __init__(
        self,
        max_plausible_speed_kmh: float = 150.0,
        blacklist_enabled: bool = True,
        impossible_travel_enabled: bool = True,
    ):
        self.max_plausible_speed_kmh = max_plausible_speed_kmh
        self.blacklist_enabled = blacklist_enabled
        self.impossible_travel_enabled = impossible_travel_enabled

    async def check_and_raise_alerts(
        self,
        detection: Dict[str, Any],
    ) -> List[Alert]:
        """
        Check detection against alert rules and return any raised alerts.
        
        Args:
            detection: Detection dict with keys:
                - plate_normalized
                - camera_id
                - detected_at (datetime string or object)
                - id (detection ID after insert)
                
        Returns:
            List of Alert objects
        """
        raised = []

        # Rule 1: Blacklist match
        if self.blacklist_enabled:
            bl_match = await check_blacklist(detection['plate_normalized'])
            if bl_match:
                alert = Alert(
                    alert_type='BLACKLIST_MATCH',
                    plate_normalized=detection['plate_normalized'],
                    detection_id=detection['id'],
                    details={'reason': bl_match['reason']},
                )
                raised.append(alert)
                logger.warning(f"BLACKLIST ALERT: {detection['plate_normalized']} - {bl_match['reason']}")

        # Rule 2: Impossible travel
        if self.impossible_travel_enabled:
            impossible_alert = await self._check_impossible_travel(detection)
            if impossible_alert:
                raised.append(impossible_alert)

        return raised

    async def _check_impossible_travel(self, detection: Dict[str, Any]) -> Optional[Alert]:
        """
        Check if vehicle traveled at impossible speed between cameras.
        
        Queries for previous detection of same plate, calculates Haversine distance
        and time difference, flags if speed > max_plausible_speed_kmh.
        """
        from db import execute_query

        plate = detection['plate_normalized']
        camera_id = detection['camera_id']
        detected_at = detection['detected_at']

        # Get previous detection of same plate (different camera)
        rows = await execute_query(
            """
            SELECT d.*, c.latitude, c.longitude, c.camera_id
            FROM detections d
            JOIN cameras c ON c.camera_id = d.camera_id
            WHERE d.plate_normalized = $1
              AND d.id != $2
              AND c.camera_id != $3
            ORDER BY d.detected_at DESC
            LIMIT 1
            """,
            (plate, detection['id'], camera_id),
        )

        if not rows:
            return None

        last = rows[0]

        # Calculate time difference in hours
        from datetime import datetime
        if isinstance(detected_at, str):
            curr_time = datetime.fromisoformat(detected_at.replace('Z', '+00:00'))
        else:
            curr_time = detected_at

        if isinstance(last['detected_at'], str):
            last_time = datetime.fromisoformat(last['detected_at'].replace('Z', '+00:00'))
        else:
            last_time = last['detected_at']

        hours = abs((curr_time - last_time).total_seconds()) / 3600.0

        if hours <= 0:
            return None

        # Calculate Haversine distance
        from geopy.distance import geodesic
        distance_km = geodesic(
            (last['latitude'], last['longitude']),
            (detection.get('latitude'), detection.get('longitude')),
        ).kilometers

        # If we don't have lat/lon in detection, fetch camera
        if detection.get('latitude') is None or detection.get('longitude') is None:
            cam_row = await execute_query(
                "SELECT latitude, longitude FROM cameras WHERE camera_id = $1",
                (camera_id,),
            )
            if cam_row:
                distance_km = geodesic(
                    (last['latitude'], last['longitude']),
                    (cam_row[0]['latitude'], cam_row[0]['longitude']),
                ).kilometers
            else:
                return None

        speed_kmh = distance_km / hours

        if speed_kmh > self.max_plausible_speed_kmh:
            alert = Alert(
                alert_type='IMPOSSIBLE_TRAVEL',
                plate_normalized=plate,
                detection_id=detection['id'],
                details={
                    'speed_kmh': round(speed_kmh),
                    'distance_km': round(distance_km * 10) / 10,
                    'time_gap_minutes': round(hours * 60),
                    'from_camera': last['camera_id'],
                    'to_camera': camera_id,
                    'from_time': last['detected_at'].isoformat() if hasattr(last['detected_at'], 'isoformat') else str(last['detected_at']),
                    'to_time': detected_at.isoformat() if hasattr(detected_at, 'isoformat') else str(detected_at),
                },
            )
            logger.warning(
                f"IMPOSSIBLE TRAVEL: {plate} - {speed_kmh:.0f} km/h "
                f"({last['camera_id']} -> {camera_id}, {distance_km:.1f} km in {hours*60:.0f} min)"
            )
            return alert

        return None


# Singleton
_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService(
            max_plausible_speed_kmh=settings.max_plausible_speed_kmh,
            blacklist_enabled=settings.blacklist_check_enabled,
            impossible_travel_enabled=settings.impossible_travel_check_enabled,
        )
    return _alert_service