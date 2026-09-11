import time
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from collections import deque

import cv2
import numpy as np
from ultralytics import YOLO

from .detector import VehicleDetection, PlateDetection, YOLODetector
from ocr.base import BaseOCREngine, OCRResult
from ocr.syntax_repair import repair_plate_text, validate_plate_format


@dataclass
class TrackState:
    track_id: int
    vehicle_type: str
    vehicle_bbox: Tuple[int, int, int, int]
    plate_detections: List[PlateDetection] = field(default_factory=list)
    last_seen_frame: int = 0
    consecutive_misses: int = 0
    ocr_result: Optional[OCRResult] = None
    ocr_completed: bool = False


class TrackManager:
    """
    Manages vehicle tracks with ByteTrack ID persistence and plate crop buffering.
    Accumulates up to MAX_CROPS_PER_TRACK plate crops per vehicle.
    Triggers OCR when vehicle leaves frame (consecutive misses threshold).
    """

    def __init__(
        self,
        detector: YOLODetector,
        ocr_engine: BaseOCREngine,
        max_crops: int = 8,
        miss_threshold: int = 15,
        frame_skip: int = 3,
    ):
        self.detector = detector
        self.ocr_engine = ocr_engine
        self.max_crops = max_crops
        self.miss_threshold = miss_threshold
        self.frame_skip = frame_skip

        self.tracks: Dict[int, TrackState] = {}
        self.next_track_id = 1
        self.frame_count = 0
        self.processed_count = 0

    def process_frame(self, frame: np.ndarray) -> List[PlateDetection]:
        """
        Process a single frame: detect vehicles, track them, detect plates,
        accumulate crops, trigger OCR on departure.

        Returns:
            List of new PlateDetection objects from this frame
        """
        self.frame_count += 1

        # Only run detection every N frames
        if self.frame_count % self.frame_skip != 0:
            # Still increment miss counters for existing tracks
            self._increment_misses()
            self._check_departures()
            return []

        # 1. Detect vehicles
        vehicle_detections = self.detector.detect_vehicles(frame)

        # 2. Simple IoU-based tracking (ByteTrack would be used in production)
        self._update_tracks(vehicle_detections)

        # 3. Detect plates on tracked vehicles
        new_plate_detections = []
        for track_id, track in self.tracks.items():
            if track.last_seen_frame != self.frame_count:
                continue  # vehicle absent this frame — don't detect or reset

            plate_dets = self.detector.detect_plates_on_vehicle(frame, track.vehicle_bbox)
            for pd in plate_dets:
                pd.track_id = track_id
                if self.detector.is_quality_crop(pd.crop):
                    track.plate_detections.append(pd)
                    # Keep only best N crops by confidence
                    track.plate_detections.sort(key=lambda x: x.confidence, reverse=True)
                    track.plate_detections = track.plate_detections[:self.max_crops]
                    new_plate_detections.append(pd)

        # 4. Increment misses for tracks not seen this frame
        self._increment_misses()

        # 5. Check for departures and trigger OCR
        self._check_departures()

        self.processed_count += 1
        return new_plate_detections

    def _update_tracks(self, vehicle_detections: List[VehicleDetection]) -> None:
        """Simple IoU-based tracker (replace with ByteTrack for production)."""
        if not self.tracks:
            # First frame - create new tracks
            for vd in vehicle_detections:
                track_id = self.next_track_id
                self.next_track_id += 1
                self.tracks[track_id] = TrackState(
                    track_id=track_id,
                    vehicle_type=vd.vehicle_type,
                    vehicle_bbox=vd.bbox,
                    last_seen_frame=self.frame_count,
                )
            return

        # Match detections to existing tracks by IoU
        matched_track_ids = set()
        for vd in vehicle_detections:
            best_track_id = None
            best_iou = 0.3  # Minimum IoU threshold

            for track_id, track in self.tracks.items():
                if track_id in matched_track_ids:
                    continue
                iou = self._calculate_iou(vd.bbox, track.vehicle_bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id

            if best_track_id is not None:
                # Update existing track
                track = self.tracks[best_track_id]
                track.vehicle_bbox = vd.bbox
                track.vehicle_type = vd.vehicle_type
                track.last_seen_frame = self.frame_count
                track.consecutive_misses = 0
                matched_track_ids.add(best_track_id)
            else:
                # New track
                track_id = self.next_track_id
                self.next_track_id += 1
                self.tracks[track_id] = TrackState(
                    track_id=track_id,
                    vehicle_type=vd.vehicle_type,
                    vehicle_bbox=vd.bbox,
                    last_seen_frame=self.frame_count,
                )
                matched_track_ids.add(track_id)

    def _increment_misses(self) -> None:
        for track in self.tracks.values():
            if track.last_seen_frame != self.frame_count:
                track.consecutive_misses += 1

    def _check_departures(self) -> None:
        """Trigger OCR for tracks that have departed (missed N consecutive frames)."""
        departed = [
            tid for tid, track in self.tracks.items()
            if track.consecutive_misses >= self.miss_threshold and not track.ocr_completed
        ]

        for track_id in departed:
            track = self.tracks[track_id]
            if track.plate_detections:
                crops = [pd.crop for pd in track.plate_detections if pd.crop is not None]
                if crops:
                    track.ocr_result = self.ocr_engine.recognize_track(crops)
                    track.ocr_completed = True

    def _calculate_iou(self, box1: Tuple[int, int, int, int], box2: Tuple[int, int, int, int]) -> float:
        x1_min, y1_min, x1_max, y1_max = box1
        x2_min, y2_min, x2_max, y2_max = box2

        inter_x1 = max(x1_min, x2_min)
        inter_y1 = max(y1_min, y2_min)
        inter_x2 = min(x1_max, x2_max)
        inter_y2 = min(y1_max, y2_max)

        if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
            return 0.0

        inter_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
        box1_area = (x1_max - x1_min) * (y1_max - y1_min)
        box2_area = (x2_max - x2_min) * (y2_max - y2_min)

        return inter_area / (box1_area + box2_area - inter_area)

    def get_completed_tracks(self) -> List[Tuple[int, OCRResult]]:
        """Get tracks that have completed OCR processing."""
        return [
            (tid, track.ocr_result)
            for tid, track in self.tracks.items()
            if track.ocr_completed and track.ocr_result is not None
        ]

    def get_active_tracks(self) -> Dict[int, TrackState]:
        return {tid: t for tid, t in self.tracks.items() if not t.ocr_completed}


class ByteTrackManager(TrackManager):
    """
    ByteTrack integration using Ultralytics built-in tracking.
    More robust than simple IoU tracking.
    """

    def __init__(
        self,
        detector: YOLODetector,
        ocr_engine: BaseOCREngine,
        max_crops: int = 8,
        miss_threshold: int = 15,
        frame_skip: int = 3,
    ):
        super().__init__(detector, ocr_engine, max_crops, miss_threshold, frame_skip)
        self.tracker_args = {
            'tracker': 'bytetrack.yaml',
            'persist': True,
        }

    def process_frame(self, frame: np.ndarray) -> List[PlateDetection]:
        self.frame_count += 1

        if self.frame_count % self.frame_skip != 0:
            self._increment_misses()
            self._check_departures()
            return []

        # Use YOLO's built-in tracking
        results = self.detector.vehicle_model.track(
            frame,
            verbose=False,
            device=self.detector.device,
            conf=self.detector.confidence_threshold,
            iou=self.detector.iou_threshold,
            classes=list(self.detector.VEHICLE_CLASSES.keys()),
            **self.tracker_args,
        )

        vehicle_detections = []
        for r in results:
            boxes = r.boxes
            if boxes is None or len(boxes) == 0:
                continue

            xyxy = boxes.xyxy.cpu().numpy().astype(int)
            confs = boxes.conf.cpu().numpy()
            clss = boxes.cls.cpu().numpy().astype(int)
            track_ids = boxes.id.int().cpu().numpy() if boxes.id is not None else None

            if track_ids is None:
                continue

            for (x1, y1, x2, y2), conf, cls, tid in zip(xyxy, confs, clss, track_ids):
                vehicle_type = self.detector.VEHICLE_CLASSES.get(cls, 'unknown')
                vehicle_detections.append(VehicleDetection(
                    bbox=(x1, y1, x2, y2),
                    confidence=float(conf),
                    vehicle_type=vehicle_type,
                    track_id=int(tid),
                ))

        # Update tracks with ByteTrack IDs
        self._update_tracks_bytetrack(vehicle_detections)

        # Detect plates
        new_plate_detections = []
        for track_id, track in self.tracks.items():
            if track.last_seen_frame != self.frame_count:
                continue  # vehicle absent this frame — don't detect or reset

            plate_dets = self.detector.detect_plates_on_vehicle(frame, track.vehicle_bbox)
            for pd in plate_dets:
                pd.track_id = track_id
                if self.detector.is_quality_crop(pd.crop):
                    track.plate_detections.append(pd)
                    track.plate_detections.sort(key=lambda x: x.confidence, reverse=True)
                    track.plate_detections = track.plate_detections[:self.max_crops]
                    new_plate_detections.append(pd)

        self._increment_misses()
        self._check_departures()
        self.processed_count += 1

        return new_plate_detections

    def _update_tracks_bytetrack(self, vehicle_detections: List[VehicleDetection]) -> None:
        """Update tracks using ByteTrack IDs.

        Miss increments are handled centrally by `_increment_misses()`
        (tracks whose last_seen_frame != current frame) — do NOT double-count here.
        """
        for vd in vehicle_detections:
            track_id = vd.track_id
            if track_id in self.tracks:
                track = self.tracks[track_id]
                track.vehicle_bbox = vd.bbox
                track.vehicle_type = vd.vehicle_type
                track.last_seen_frame = self.frame_count
                track.consecutive_misses = 0
            else:
                self.tracks[track_id] = TrackState(
                    track_id=track_id,
                    vehicle_type=vd.vehicle_type,
                    vehicle_bbox=vd.bbox,
                    last_seen_frame=self.frame_count,
                )