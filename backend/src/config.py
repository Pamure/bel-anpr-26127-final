from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Literal
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql://anpr_user:secure_password_change_me@localhost:5433/bel_anpr",
        validation_alias="DATABASE_URL",
    )

    api_key: str = Field(
        default="bel-anpr-2026-secret-key-change-in-production",
        validation_alias="API_KEY",
    )

    osrm_base_url: str = Field(
        default="http://127.0.0.1:5000",
        validation_alias="OSRM_BASE_URL",
    )

    vehicle_model_path: str = Field(
        default="/app/models/yolo26s.pt",
        validation_alias="VEHICLE_MODEL_PATH",
    )

    plate_model_path: str = Field(
        default="/app/models/best_plate.pt",
        validation_alias="PLATE_MODEL_PATH",
    )

    ocr_engine: Literal["paddleocr", "teammate", "friend"] = Field(
        default="paddleocr",
        validation_alias="OCR_ENGINE",
    )

    frame_skip: int = Field(default=3, validation_alias="FRAME_SKIP")
    max_crops_per_track: int = Field(default=8, validation_alias="MAX_CROPS_PER_TRACK")
    min_crop_width: int = Field(default=15, validation_alias="MIN_CROP_WIDTH")
    min_crop_height: int = Field(default=30, validation_alias="MIN_CROP_HEIGHT")
    aspect_ratio_min: float = Field(default=1.0, validation_alias="ASPECT_RATIO_MIN")
    aspect_ratio_max: float = Field(default=7.0, validation_alias="ASPECT_RATIO_MAX")
    confidence_threshold: float = Field(default=0.25, validation_alias="CONFIDENCE_THRESHOLD")
    iou_threshold: float = Field(default=0.45, validation_alias="IOU_THRESHOLD")

    max_plausible_speed_kmh: float = Field(default=150.0, validation_alias="MAX_PLAUSIBLE_SPEED_KMH")
    blacklist_check_enabled: bool = Field(default=True, validation_alias="BLACKLIST_CHECK_ENABLED")
    impossible_travel_check_enabled: bool = Field(default=True, validation_alias="IMPOSSIBLE_TRAVEL_CHECK_ENABLED")

    vite_api_base: str = Field(default="http://localhost:8088", validation_alias="VITE_API_BASE")
    vite_osrm_proxy: str = Field(default="/api/osrm", validation_alias="VITE_OSRM_PROXY")


settings = Settings()


def get_database_url_sync() -> str:
    url = settings.database_url
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url