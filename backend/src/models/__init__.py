from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime
from enum import Enum


class VehicleType(str, Enum):
    CAR = "car"
    BIKE = "bike"
    TRUCK = "truck"
    BUS = "bus"
    UNKNOWN = "unknown"


class AlertType(str, Enum):
    BLACKLIST_MATCH = "BLACKLIST_MATCH"
    IMPOSSIBLE_TRAVEL = "IMPOSSIBLE_TRAVEL"
    GEOFENCE_ENTER = "GEOFENCE_ENTER"
    GEOFENCE_EXIT = "GEOFENCE_EXIT"


class DetectionBase(BaseModel):
    camera_id: str = Field(..., min_length=1, max_length=50)
    plate_raw: str = Field(..., min_length=1, max_length=20)
    plate_normalized: str = Field(..., min_length=1, max_length=20)
    confidence: float = Field(..., ge=0.0, le=1.0)
    vehicle_type: VehicleType = VehicleType.UNKNOWN
    image_ref: Optional[str] = None
    detected_at: datetime

    @field_validator("plate_normalized", mode="before")
    @classmethod
    def normalize_plate(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")


class DetectionCreate(DetectionBase):
    pass


class DetectionResponse(DetectionBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CameraBase(BaseModel):
    camera_id: str = Field(..., min_length=1, max_length=50)
    label: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class CameraCreate(CameraBase):
    pass


class CameraResponse(CameraBase):
    created_at: datetime

    model_config = {"from_attributes": True}


class BlacklistBase(BaseModel):
    plate_normalized: str = Field(..., min_length=1, max_length=20)
    reason: str = Field(..., min_length=1, max_length=200)
    added_by: Optional[str] = None

    @field_validator("plate_normalized", mode="before")
    @classmethod
    def normalize_plate(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")


class BlacklistCreate(BlacklistBase):
    pass


class BlacklistResponse(BlacklistBase):
    id: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: int
    alert_type: AlertType
    plate_normalized: str
    detection_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrajectoryPoint(BaseModel):
    id: int
    camera_id: str
    camera_label: Optional[str] = None
    latitude: float
    longitude: float
    plate_raw: str
    plate_normalized: str
    confidence: float
    vehicle_type: VehicleType
    detected_at: datetime
    image_ref: Optional[str] = None


class TrajectoryResponse(BaseModel):
    plate: str
    mode: Literal["exact", "fuzzy"]
    sightings_count: int
    points: List[TrajectoryPoint]
    geojson: Dict[str, Any]


class AnalyticsDensityResponse(BaseModel):
    hour_bucket: datetime
    camera_id: str
    camera_label: str
    vehicle_count: int
    unique_plates: int


class AnalyticsHeatmapResponse(BaseModel):
    camera_id: str
    camera_label: str
    latitude: float
    longitude: float
    unique_vehicles: int
    total_detections: int


class AnalyticsODResponse(BaseModel):
    origin_camera: str
    origin_label: str
    destination_camera: str
    destination_label: str
    vehicle_count: int
    avg_transit_minutes: float


class AnalyticsSpeedResponse(BaseModel):
    camera_a: str
    camera_b: str
    distance_km: float
    avg_speed_kmh: float
    sample_count: int


class HealthResponse(BaseModel):
    status: str
    db: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StreamConfig(BaseModel):
    camera_id: str
    source: str
    frame_skip: int = 3
    confidence: float = 0.25