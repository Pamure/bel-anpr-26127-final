"""
ANPR Module for BEL ANPR 26127

Exports:
- YOLODetector: Two-stage vehicle + plate detection
- TensorRTDetector: TensorRT-optimized variant
- VehicleDetection / PlateDetection: Detection dataclasses
- TrackManager / ByteTrackManager: Vehicle tracking with crop accumulation
- ANPRPipeline / PipelineManager: Producer-consumer video pipeline
"""

from .detector import (
    YOLODetector,
    TensorRTDetector,
    VehicleDetection,
    PlateDetection,
    Detection,
)
from .tracker import TrackManager, ByteTrackManager, TrackState
from .pipeline import ANPRPipeline, PipelineManager, PipelineConfig, ProcessedFrame

__all__ = [
    "YOLODetector",
    "TensorRTDetector",
    "VehicleDetection",
    "PlateDetection",
    "Detection",
    "TrackManager",
    "ByteTrackManager",
    "TrackState",
    "ANPRPipeline",
    "PipelineManager",
    "PipelineConfig",
    "ProcessedFrame",
]