import asyncio
import time
import cv2
import numpy as np
from typing import Optional, List, Dict, Any, Callable, AsyncGenerator
from dataclasses import dataclass
from collections import deque
import logging

from .detector import YOLODetector, TensorRTDetector, PlateDetection
from .tracker import TrackManager, ByteTrackManager
from ocr.base import BaseOCREngine, OCRResult
from config import settings

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    source: str
    camera_id: str
    frame_skip: int = 3
    confidence: float = 0.25
    use_tensorrt: bool = False
    vehicle_engine: Optional[str] = None
    plate_engine: Optional[str] = None


@dataclass
class ProcessedFrame:
    camera_id: str
    frame_number: int
    timestamp: float
    detections: List[PlateDetection]
    annotated_frame: Optional[np.ndarray] = None
    completed_tracks: List[tuple] = None


class ANPRPipeline:
    """
    High-performance ANPR pipeline with decoupled producer-consumer architecture.
    - Producer: Reads video frames, runs detection/tracking
    - Consumer: Runs OCR on completed tracks, writes to database
    - MJPEG stream: Lock-free frame buffer for web streaming
    """

    def __init__(
        self,
        config: PipelineConfig,
        ocr_engine: BaseOCREngine,
        detection_callback: Optional[Callable[[List[tuple]], None]] = None,
        frame_callback: Optional[Callable[[np.ndarray], None]] = None,
    ):
        self.config = config
        self.ocr_engine = ocr_engine
        self.detection_callback = detection_callback
        self.frame_callback = frame_callback

        # Initialize detector
        if config.use_tensorrt and config.vehicle_engine and config.plate_engine:
            self.detector = TensorRTDetector(
                config.vehicle_engine,
                config.plate_engine,
                confidence_threshold=config.confidence,
            )
        else:
            self.detector = YOLODetector(
                confidence_threshold=config.confidence,
            )

        # Initialize tracker
        self.tracker = ByteTrackManager(
            self.detector,
            ocr_engine,
            max_crops=settings.max_crops_per_track,
            miss_threshold=15,
            frame_skip=config.frame_skip,
        )

        # Frame buffer for MJPEG streaming (lock-free ring buffer)
        self._frame_buffer: Optional[np.ndarray] = None
        self._buffer_lock = asyncio.Lock()

        # Control flags
        self._running = False
        self._cap: Optional[cv2.VideoCapture] = None

    async def start(self) -> None:
        """Start the pipeline."""
        self._running = True
        self._cap = cv2.VideoCapture(self.config.source)

        if not self._cap.isOpened():
            raise RuntimeError(f"Cannot open video source: {self.config.source}")

        logger.info(f"Pipeline started for {self.config.camera_id}")

        # Run producer loop
        await self._producer_loop()

    async def stop(self) -> None:
        """Stop the pipeline."""
        self._running = False
        if self._cap:
            self._cap.release()
        logger.info(f"Pipeline stopped for {self.config.camera_id}")

    async def _producer_loop(self) -> None:
        """Main producer loop - reads frames and processes detections."""
        frame_number = 0

        while self._running:
            ret, frame = self._cap.read()
            if not ret:
                # End of video - loop for testing
                self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame_number += 1

            # Process frame through tracker
            plate_detections = self.tracker.process_frame(frame)

            # Annotate frame for streaming
            annotated = self._annotate_frame(frame, plate_detections)

            # Update frame buffer for MJPEG stream
            async with self._buffer_lock:
                self._frame_buffer = annotated.copy()

            # Frame callback for external streaming
            if self.frame_callback:
                try:
                    self.frame_callback(annotated)
                except Exception as e:
                    logger.error(f"Frame callback error: {e}")

            # Check for completed tracks and run OCR
            completed = self.tracker.get_completed_tracks()
            if completed and self.detection_callback:
                try:
                    await self.detection_callback(completed)
                except Exception as e:
                    logger.error(f"Detection callback error: {e}")

            # Small yield to prevent blocking event loop
            await asyncio.sleep(0)

    def _annotate_frame(
        self,
        frame: np.ndarray,
        plate_detections: List[PlateDetection],
    ) -> np.ndarray:
        """Draw bounding boxes and labels on frame."""
        annotated = frame.copy()

        # Draw vehicle tracks
        for track_id, track in self.tracker.tracks.items():
            vx1, vy1, vx2, vy2 = track.vehicle_bbox
            color = (0, 255, 0) if not track.ocr_completed else (0, 255, 255)
            cv2.rectangle(annotated, (vx1, vy1), (vx2, vy2), color, 2)
            cv2.putText(
                annotated,
                f"ID:{track_id} {track.vehicle_type}",
                (vx1, vy1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                color,
                2,
            )

            # Draw plate detections
            for pd in track.plate_detections:
                px1, py1, px2, py2 = pd.bbox
                cv2.rectangle(annotated, (px1, py1), (px2, py2), (255, 0, 0), 2)
                cv2.putText(
                    annotated,
                    f"Plate:{pd.confidence:.2f}",
                    (px1, py1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 0, 0),
                    1,
                )

            # Draw OCR result if completed
            if track.ocr_completed and track.ocr_result:
                ocr = track.ocr_result
                color = (0, 255, 0) if ocr.is_valid_format else (0, 165, 255)
                cv2.putText(
                    annotated,
                    f"{ocr.plate_text} ({ocr.confidence:.2f})",
                    (vx1, vy2 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    color,
                    2,
                )

        # Camera ID overlay
        cv2.putText(
            annotated,
            self.config.camera_id,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 255),
            2,
        )

        return annotated

    async def get_latest_frame(self) -> Optional[np.ndarray]:
        """Get latest annotated frame for MJPEG streaming (non-blocking)."""
        async with self._buffer_lock:
            if self._frame_buffer is not None:
                return self._frame_buffer.copy()
        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get pipeline statistics."""
        return {
            "camera_id": self.config.camera_id,
            "frame_count": self.tracker.frame_count,
            "processed_count": self.tracker.processed_count,
            "active_tracks": len(self.tracker.get_active_tracks()),
            "completed_tracks": len(self.tracker.get_completed_tracks()),
        }


class PipelineManager:
    """Manages multiple ANPR pipelines for multi-camera deployment."""

    def __init__(self, ocr_engine: BaseOCREngine):
        self.ocr_engine = ocr_engine
        self.pipelines: Dict[str, ANPRPipeline] = {}
        self._detection_queue: asyncio.Queue = asyncio.Queue()

    async def add_camera(self, config: PipelineConfig) -> ANPRPipeline:
        """Add a new camera pipeline."""
        pipeline = ANPRPipeline(
            config,
            self.ocr_engine,
            detection_callback=self._on_detection,
        )
        self.pipelines[config.camera_id] = pipeline
        return pipeline

    async def start_all(self) -> None:
        """Start all pipelines concurrently."""
        await asyncio.gather(*[p.start() for p in self.pipelines.values()])

    async def stop_all(self) -> None:
        """Stop all pipelines."""
        await asyncio.gather(*[p.stop() for p in self.pipelines.values()])

    async def _on_detection(self, completed_tracks: List[tuple]) -> None:
        """Handle completed track detections - queue for database insertion."""
        for track_id, ocr_result in completed_tracks:
            await self._detection_queue.put({
                "track_id": track_id,
                "ocr_result": ocr_result.to_dict(),
                "timestamp": time.time(),
            })

    async def get_detections(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Async generator for processed detections."""
        while True:
            detection = await self._detection_queue.get()
            yield detection

    def get_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Get latest frame from specific camera (sync, non-blocking)."""
        if camera_id in self.pipelines:
            # This is sync - in production use async get_latest_frame
            pipeline = self.pipelines[camera_id]
            # Return a copy if available (would need async in real use)
            return None  # Placeholder - use get_latest_frame() async

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        return {cid: p.get_stats() for cid, p in self.pipelines.items()}