import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from db import (
    get_density_analytics,
    get_heatmap_analytics,
    get_od_analytics,
    get_speed_analytics,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Macro traffic analytics: density, heatmaps, origin-destination, speed corridors.
    """

    def __init__(self, default_hours: int = 24):
        self.default_hours = default_hours

    async def get_density(self, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """Hourly vehicle density per camera."""
        return await get_density_analytics(hours or self.default_hours)

    async def get_heatmap(self, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """Traffic heatmap: unique vehicles and total detections per camera."""
        return await get_heatmap_analytics(hours or self.default_hours)

    async def get_od_matrix(self, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """Origin-Destination flow matrix."""
        return await get_od_analytics(hours or self.default_hours)

    async def get_speed_corridors(self, hours: Optional[int] = None) -> List[Dict[str, Any]]:
        """Average speed between camera pairs."""
        return await get_speed_analytics(hours or self.default_hours)

    async def get_summary(self, hours: Optional[int] = None) -> Dict[str, Any]:
        """Combined summary for dashboard."""
        h = hours or self.default_hours
        return {
            'density': await self.get_density(h),
            'heatmap': await self.get_heatmap(h),
            'od_matrix': await self.get_od_matrix(h),
            'speed_corridors': await self.get_speed_corridors(h),
            'time_window_hours': h,
            'generated_at': datetime.utcnow().isoformat(),
        }


# Singleton
_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service