import asyncio
import cv2
import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse

from anpr.pipeline import PipelineManager, PipelineConfig
from ocr import create_ocr_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stream", tags=["Stream"])

# Global pipeline manager
_pipeline_manager: Optional[PipelineManager] = None


def get_pipeline_manager() -> PipelineManager:
    global _pipeline_manager
    if _pipeline_manager is None:
        from config import settings as app_settings
        ocr_engine = create_ocr_engine(app_settings.ocr_engine)
        _pipeline_manager = PipelineManager(ocr_engine)
    return _pipeline_manager


@router.post(
    "/cameras",
    summary="Add a camera stream",
)
async def add_camera(
    camera_id: str = Query(..., description="Unique camera ID"),
    source: str = Query(..., description="Video source (file path, RTSP URL, or device index)"),
    frame_skip: int = Query(3, ge=1, le=30),
    confidence: float = Query(0.25, ge=0.1, le=1.0),
):
    """Add a camera to the pipeline manager."""
    manager = get_pipeline_manager()
    
    config = PipelineConfig(
        source=source,
        camera_id=camera_id,
        frame_skip=frame_skip,
        confidence=confidence,
    )
    
    await manager.add_camera(config)
    return {"status": "added", "camera_id": camera_id, "source": source}


@router.get(
    "/cameras",
    summary="List all configured cameras",
)
async def list_cameras():
    """Get all configured cameras from database."""
    from db import execute_query
    try:
        cameras = await execute_query(
            "SELECT camera_id, label, latitude, longitude FROM cameras ORDER BY camera_id"
        )
        return {"cameras": cameras}
    except Exception as e:
        logger.error(f"Failed to fetch cameras: {e}")
        return {"cameras": []}


@router.post(
    "/start",
    summary="Start all camera pipelines",
)
async def start_streams():
    """Start all registered camera pipelines."""
    manager = get_pipeline_manager()
    await manager.start_all()
    return {"status": "started", "cameras": list(manager.pipelines.keys())}


@router.post(
    "/stop",
    summary="Stop all camera pipelines",
)
async def stop_streams():
    """Stop all camera pipelines."""
    manager = get_pipeline_manager()
    await manager.stop_all()
    return {"status": "stopped"}


@router.get(
    "/mjpeg/{camera_id}",
    summary="MJPEG stream for a camera",
)
async def mjpeg_stream(camera_id: str):
    """
    MJPEG stream with annotated bounding boxes.
    
    Returns multipart/x-mixed-replace stream compatible with <img> tags.
    """
    manager = get_pipeline_manager()
    
    if camera_id not in manager.pipelines:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    pipeline = manager.pipelines[camera_id]

    async def frame_generator():
        boundary = "frame"
        while True:
            frame = await pipeline.get_latest_frame()
            if frame is not None:
                # Encode as JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_bytes = buffer.tobytes()
                
                yield (
                    f"--{boundary}\r\n"
                    f"Content-Type: image/jpeg\r\n"
                    f"Content-Length: {len(frame_bytes)}\r\n\r\n"
                ).encode() + frame_bytes + b"\r\n"
            
            await asyncio.sleep(0.033)  # ~30 FPS max

    return StreamingResponse(
        frame_generator(),
        media_type=f"multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.get(
    "/stats",
    summary="Get pipeline statistics for all cameras",
)
async def get_stream_stats():
    """Get statistics for all active pipelines."""
    manager = get_pipeline_manager()
    return manager.get_all_stats()


@router.get(
    "/detections/recent",
    summary="Get recent OCR detections from streams",
)
async def get_recent_detections(limit: int = 50):
    """Get recent plate detections from active streams."""
    manager = get_pipeline_manager()
    
    detections = []
    async for detection in manager.get_detections():
        detections.append(detection)
        if len(detections) >= limit:
            break
    
    return {"detections": detections}