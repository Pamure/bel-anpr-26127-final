import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field, field_validator

from models import (
    DetectionCreate,
    DetectionResponse,
    VehicleType,
)
from db import insert_detection, get_detections
from services import get_alert_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/detections", tags=["Detections"])


class DetectionIngest(BaseModel):
    """Input model for detection ingestion from edge devices."""
    camera_id: str = Field(..., min_length=1, max_length=50)
    plate_raw: str = Field(..., min_length=1, max_length=20)
    confidence: float = Field(..., ge=0.0, le=1.0)
    vehicle_type: VehicleType = VehicleType.UNKNOWN
    image_ref: Optional[str] = None
    detected_at: datetime

    @field_validator("plate_raw", mode="before")
    @classmethod
    def normalize_raw(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")


class IngestResponse(BaseModel):
    detection: DetectionResponse
    alerts_raised: List[dict] = []


def normalize_plate(text: str) -> str:
    return text.upper().replace(" ", "").replace("-", "")


@router.post(
    "",
    response_model=IngestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a plate detection from edge ANPR",
)
async def ingest_detection(payload: DetectionIngest):
    """
    Ingest a license plate detection from an edge camera.
    
    Normalizes plate text, stores in database, checks alert rules.
    Returns the created detection and any alerts raised.
    """
    plate_norm = normalize_plate(payload.plate_raw)

    # Insert detection
    detection = await insert_detection(
        camera_id=payload.camera_id,
        plate_raw=payload.plate_raw.upper(),
        plate_normalized=plate_norm,
        confidence=payload.confidence,
        vehicle_type=payload.vehicle_type.value,
        image_ref=payload.image_ref,
        detected_at=payload.detected_at.isoformat(),
    )

    # Check alerts
    alert_service = get_alert_service()
    alerts = await alert_service.check_and_raise_alerts(detection)

    alert_dicts = [
        {
            "alert_type": a.alert_type,
            "plate_normalized": a.plate_normalized,
            "detection_id": a.detection_id,
            "details": a.details,
        }
        for a in alerts
    ]

    return IngestResponse(
        detection=DetectionResponse(**detection),
        alerts_raised=alert_dicts,
    )


@router.get(
    "",
    response_model=List[DetectionResponse],
    summary="List detections with optional filters",
)
async def list_detections(
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    plate_normalized: Optional[str] = Query(None, description="Filter by normalized plate"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """List detections with pagination and optional filters."""
    # Normalize plate filter if provided
    plate_filter = normalize_plate(plate_normalized) if plate_normalized else None

    rows = await get_detections(
        camera_id=camera_id,
        plate_normalized=plate_filter,
        limit=limit,
        offset=offset,
    )

    return [DetectionResponse(**r) for r in rows]


@router.get(
    "/{detection_id}",
    response_model=DetectionResponse,
    summary="Get single detection by ID",
)
async def get_detection(detection_id: int):
    """Get a single detection by ID."""
    rows = await get_detections(limit=1, offset=0)
    for r in rows:
        if r['id'] == detection_id:
            return DetectionResponse(**r)
    raise HTTPException(status_code=404, detail="Detection not found")