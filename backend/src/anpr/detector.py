import os
import time
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

import cv2
import numpy as np
from ultralytics import YOLO

from config import settings


@dataclass
class Detection:
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    confidence: float
    class_id: int
    class_name: str


@dataclass
class VehicleDetection:
    bbox: Tuple[int, int, int, int]
    confidence: float
    vehicle_type: str
    track_id: Optional[int] = None


@dataclass
class PlateDetection:
    bbox: Tuple[int, int, int, int]
    confidence: float
    vehicle_bbox: Tuple[int, int, int, int]
    track_id: int
    crop: Optional[np.ndarray] = None


class YOLODetector:
    """
    Two-stage detector:
    1. Vehicle detection with YOLO26s (or fallback to YOLOv8)
    2. Plate detection on vehicle crops with fine-tuned model
    """

    VEHICLE_CLASSES = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}
    MIN_VEHICLE_WIDTH = 100
    MIN_VEHICLE_HEIGHT = 60
    ANPR_ZONE_Y_MIN = 0.20
    def __init__(
        self,
        vehicle_model_path: Optional[str] = None,
        plate_model_path: Optional[str] = None,
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        device: str = 'cpu',
    ):
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        # Load vehicle model (YOLO26s or YOLOv8/11)
        vmodel = vehicle_model_path or settings.vehicle_model_path
        if not os.path.exists(vmodel):
            # Fallback to YOLOv8n if TensorRT engine not found
            vmodel = 'yolov8n.neo'
        self.vehicle_model = YOLO(vmodel)
        self.vehicle_model.to(device)

        # Load plate model (fine-tuned)
        pmodel = plate_model_path or settings.plate_model_path
        if not os.path.exists(pmodel):
            # Will raise if no plate model - this is required
            raise FileNotFoundError(f"Plate model not found at {pmodel}")
        self.plate_model = YOLO(pmodel)
        self.plate_model.to(device)

        # Warm up
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _ = self.vehicle_model(dummy, verbose=False, device=device)
        _ = self.plate_model(dummy, verbose=False, device=device)

    def detect_vehicles(self, frame: np.ndarray) -> List[VehicleDetection]:
        """Detect vehicles in frame, return list of VehicleDetection."""
        results = self.vehicle_model(
            frame,
            verbose=False,
            device=self.device,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            classes=list(self.VEHICLE_CLASSES.keys()),
        )

        detections = []
        for r in results:
            boxes = r.boxes
            if boxes is None or len(boxes) == 0:
                continue

            xyxy = boxes.xyxy.cpu().numpy().astype(int)
            confs = boxes.conf.cpu().numpy()
            clss = boxes.cls.cpu().numpy().astype(int)

            h_frame = frame.shape[0]
            for (x1, y1, x2, y2), conf, cls in zip(xyxy, confs, clss):
                bw = x2 - x1
                bh = y2 - y1
                # Ignore distant background blobs outside ANPR resolvable zone
                if bw < self.MIN_VEHICLE_WIDTH or bh < self.MIN_VEHICLE_HEIGHT:
                    continue
                if (y1 / h_frame) < self.ANPR_ZONE_Y_MIN:
                    continue
                vehicle_type = self.VEHICLE_CLASSES.get(cls, 'unknown')
                detections.append(VehicleDetection(
                    bbox=(x1, y1, x2, y2),
                    confidence=float(conf),
                    vehicle_type=vehicle_type,
                ))

        return detections

    def detect_plates_on_vehicle(self, frame: np.ndarray, vehicle_bbox: Tuple[int, int, int, int]) -> List[PlateDetection]:
        """Detect plates within a vehicle bounding box."""
        vx1, vy1, vx2, vy2 = vehicle_bbox
        vehicle_crop = frame[vy1:vy2, vx1:vx2]

        if vehicle_crop.size == 0:
            return []

        results = self.plate_model(
            vehicle_crop,
            verbose=False,
            device=self.device,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
        )

        detections = []
        for r in results:
            boxes = r.boxes
            if boxes is None or len(boxes) == 0:
                continue

            xyxy = boxes.xyxy.cpu().numpy().astype(int)
            confs = boxes.conf.cpu().numpy()

            for (px1, py1, px2, py2), conf in zip(xyxy, confs):
                # Convert plate coords back to full frame coordinates
                fx1 = vx1 + px1
                fy1 = vy1 + py1
                fx2 = vx1 + px2
                fy2 = vy1 + py2

                plate_crop = frame[fy1:fy2, fx1:fx2]

                detections.append(PlateDetection(
                    bbox=(fx1, fy1, fx2, fy2),
                    confidence=float(conf),
                    vehicle_bbox=vehicle_bbox,
                    track_id=-1,  # Will be set by tracker
                    crop=plate_crop,
                ))

        return detections

    def is_quality_crop(self, crop: np.ndarray) -> bool:
        """Check if plate crop meets quality thresholds."""
        if crop is None or crop.size == 0:
            return False

        h, w = crop.shape[:2]
        if w < settings.min_crop_width or h < settings.min_crop_height:
            return False

        aspect = w / h if h > 0 else 0
        if aspect < settings.aspect_ratio_min or aspect > settings.aspect_ratio_max:
            return False

        # Additional quality checks
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
        mean_brightness = np.mean(gray)
        std_brightness = np.std(gray)

        # Reject too dark, too bright, or low contrast
        if mean_brightness < 30 or mean_brightness > 220:
            return False
        if std_brightness < 15:
            return False

        return True


class TensorRTDetector(YOLODetector):
    """TensorRT-optimized detector using .engine files."""

    def __init__(
        self,
        vehicle_engine_path: str,
        plate_engine_path: str,
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45,
    ):
        # Initialize parent without calling its __init__
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = 'cuda:0'

        # Load TensorRT engines directly
        self.vehicle_model = YOLO(vehicle_engine_path, task='detect')
        self.plate_model = YOLO(plate_engine_path, task='detect')

        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _ = self.vehicle_model(dummy, verbose=False, device=self.device)
        _ = self.plate_model(dummy, verbose=False, device=self.device)