from .api_detections import router as detections_router
from .api_trajectory import router as trajectory_router
from .api_alerts import router as alerts_router
from .api_blacklist import router as blacklist_router
from .api_analytics import router as analytics_router
from .api_stream import router as stream_router
from .api_v1_analytics import router as v1_analytics_router

__all__ = [
    "detections_router",
    "trajectory_router",
    "alerts_router",
    "blacklist_router",
    "analytics_router",
    "stream_router",
    "v1_analytics_router",
]