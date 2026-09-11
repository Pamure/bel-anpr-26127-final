import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from models import (
    AnalyticsDensityResponse,
    AnalyticsHeatmapResponse,
    AnalyticsODResponse,
    AnalyticsSpeedResponse,
)
from services import get_analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get(
    "/density",
    response_model=List[AnalyticsDensityResponse],
    summary="Hourly traffic density per camera",
)
async def get_density(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
):
    """Get hourly vehicle density for each camera."""
    analytics = get_analytics_service()
    return await analytics.get_density(hours)


@router.get(
    "/heatmap",
    response_model=List[AnalyticsHeatmapResponse],
    summary="Traffic heatmap: unique vehicles per camera",
)
async def get_heatmap(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
):
    """Get traffic heatmap data for map visualization."""
    analytics = get_analytics_service()
    return await analytics.get_heatmap(hours)


@router.get(
    "/od",
    response_model=List[AnalyticsODResponse],
    summary="Origin-Destination flow matrix",
)
async def get_od_matrix(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
):
    """Get Origin-Destination vehicle flows between cameras."""
    analytics = get_analytics_service()
    return await analytics.get_od_matrix(hours)


@router.get(
    "/speed",
    response_model=List[AnalyticsSpeedResponse],
    summary="Average speed corridors between cameras",
)
async def get_speed_corridors(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
):
    """Get average speeds between camera pairs."""
    analytics = get_analytics_service()
    return await analytics.get_speed_corridors(hours)


@router.get(
    "/summary",
    summary="Complete analytics summary for dashboard",
)
async def get_summary(
    hours: int = Query(24, ge=1, le=168, description="Time window in hours"),
) -> Dict[str, Any]:
    """Get all analytics in one call for dashboard initialization."""
    analytics = get_analytics_service()
    return await analytics.get_summary(hours)


@router.get(
    "/cameras/stats",
    summary="Per-camera statistics",
)
async def get_camera_stats():
    """Get statistics for all cameras."""
    from db import execute_query
    return await execute_query("SELECT * FROM camera_stats")