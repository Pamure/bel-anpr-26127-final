import time
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from .syntax_repair import (
    repair_plate_text,
    validate_plate_format,
    align_plates_for_voting,
    position_wise_vote,
)


@dataclass
class VotingResult:
    """Result of multi-frame voting process."""
    plate_text: str
    confidence: float
    character_confidences: List[float]
    is_valid_format: bool
    candidate_count: int
    raw_reads: List[str]
    quality_scores: List[float]
    frame_indices: List[int]


class ICPRVoter:
    """
    ICPR 2026 Multi-Frame Voting Engine.
    
    Implements the consensus decoding strategy used by top teams in the
    ICPR 2026 Low-Resolution License Plate Recognition competition:
    
    1. Quality-weighted frame selection (sharpness, contrast, brightness, SNR)
    2. Position-wise character-level voting with confidence × quality weights
    3. Layout-constrained decoding (Indian plate format enforcement)
    4. Position-aware confusion correction
    5. Temporal consistency checking
    """

    def __init__(
        self,
        min_quality_threshold: float = 0.3,
        max_frames: int = 8,
        min_frames_for_vote: int = 2,
        position_weight_scheme: str = 'confidence_quality',  # or 'uniform', 'quality_only'
    ):
        self.min_quality_threshold = min_quality_threshold
        self.max_frames = max_frames
        self.min_frames_for_vote = min_frames_for_vote
        self.position_weight_scheme = position_weight_scheme

    def compute_frame_quality(self, crop: np.ndarray) -> float:
        """
        Compute composite quality score for a frame crop.
        Based on ICPR 2026: sharpness (Laplacian), contrast (RMS), brightness, SNR.
        """
        if crop is None or crop.size == 0:
            return 0.0

        # Convert to grayscale
        if len(crop.shape) == 3:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop

        # Sharpness: Laplacian variance (most important for text)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_norm = min(sharpness / 500.0, 1.0)

        # Contrast: RMS contrast
        contrast = np.std(gray)
        contrast_norm = min(contrast / 60.0, 1.0)

        # Brightness: distance from optimal (127)
        brightness = np.mean(gray)
        brightness_norm = 1.0 - abs(brightness - 127) / 127.0

        # SNR estimate
        snr = brightness / (contrast + 1e-6)
        snr_norm = min(snr / 10.0, 1.0)

        # Weighted composite (ICPR 2026: sharpness dominant)
        overall = (
            0.4 * sharpness_norm +
            0.25 * contrast_norm +
            0.2 * brightness_norm +
            0.15 * snr_norm
        )

        return overall

    def filter_by_quality(
        self,
        crops: List[np.ndarray],
        ocr_results: List[Dict[str, Any]],
        quality_scores: Optional[List[float]] = None,
    ) -> Tuple[List[np.ndarray], List[Dict[str, Any]], List[float]]:
        """Filter crops and OCR results by quality threshold.

        Caller-supplied quality_scores are honored when provided; otherwise
        scores are computed from the crops.
        """
        if quality_scores is None:
            quality_scores = [self.compute_frame_quality(c) for c in crops]

        filtered_crops = []
        filtered_results = []
        filtered_quality = []

        for crop, result, qual in zip(crops, ocr_results, quality_scores):
            if qual >= self.min_quality_threshold:
                filtered_crops.append(crop)
                filtered_results.append(result)
                filtered_quality.append(qual)

        return filtered_crops, filtered_results, filtered_quality

    def select_best_frames(
        self,
        crops: List[np.ndarray],
        ocr_results: List[Dict[str, Any]],
        quality_scores: List[float],
    ) -> Tuple[List[np.ndarray], List[Dict[str, Any]], List[float]]:
        """Select top-N frames by quality for voting."""
        if len(crops) <= self.max_frames:
            return crops, ocr_results, quality_scores

        # Sort by quality descending
        indexed = list(zip(crops, ocr_results, quality_scores))
        indexed.sort(key=lambda x: x[2], reverse=True)

        selected = indexed[:self.max_frames]
        return (
            [x[0] for x in selected],
            [x[1] for x in selected],
            [x[2] for x in selected],
        )

    def vote_track(
        self,
        crops: List[np.ndarray],
        ocr_results: List[Dict[str, Any]],
        quality_scores: Optional[List[float]] = None,
    ) -> VotingResult:
        """
        Perform multi-frame voting on a track's plate crops.
        
        Args:
            crops: List of plate crop images
            ocr_results: List of single-frame OCR results (from recognize_single)
            quality_scores: Optional precomputed quality scores
            
        Returns:
            VotingResult with consensus plate and metadata
        """
        if not crops or not ocr_results:
            return VotingResult(
                plate_text='',
                confidence=0.0,
                character_confidences=[],
                is_valid_format=False,
                candidate_count=0,
                raw_reads=[],
                quality_scores=[],
                frame_indices=[],
            )

        # Compute quality if not provided
        if quality_scores is None:
            quality_scores = [self.compute_frame_quality(c) for c in crops]

        # Keep originals for fallback when quality filtering empties the set
        original_crops = list(crops)
        original_results = list(ocr_results)
        original_quality = list(quality_scores)

        # Filter by quality
        crops, ocr_results, quality_scores = self.filter_by_quality(
            crops, ocr_results, quality_scores
        )

        if len(crops) < self.min_frames_for_vote:
            # Not enough quality frames — fall back to best of the ORIGINAL set
            if original_results:
                best_idx = int(np.argmax(original_quality))
                best = original_results[best_idx]
                return VotingResult(
                    plate_text=best.get('text', ''),
                    confidence=best.get('confidence', 0.0),
                    character_confidences=best.get('character_confidences', []),
                    is_valid_format=validate_plate_format(best.get('text', '')),
                    candidate_count=1,
                    raw_reads=best.get('raw_results', []),
                    quality_scores=[original_quality[best_idx]] if original_quality else [0.0],
                    frame_indices=[best_idx],
                )
            return VotingResult(
                plate_text='', confidence=0.0, character_confidences=[],
                is_valid_format=False, candidate_count=0, raw_reads=[],
                quality_scores=[], frame_indices=[],
            )

        # Select best frames
        crops, ocr_results, quality_scores = self.select_best_frames(
            crops, ocr_results, quality_scores
        )

        # Extract data for voting
        texts = [r.get('text', '') for r in ocr_results]
        confidences = [r.get('confidence', 0.0) for r in ocr_results]
        raw_reads = []
        for r in ocr_results:
            raw_reads.extend(r.get('raw_results', []))

        # Align plates for position-wise voting
        aligned = align_plates_for_voting(texts)

        # Position-wise weighted voting
        voted_plate, position_confs = position_wise_vote(
            aligned,
            confidences,
            quality_scores,
        )

        # Syntax repair with Indian plate constraints
        repaired_plate, is_valid, changes = repair_plate_text(voted_plate)

        # If invalid, try repair-then-vote strategy
        if not is_valid:
            repaired_reads = []
            repaired_confidences = []
            repaired_qualities = []

            for text, conf, qual in zip(texts, confidences, quality_scores):
                repaired, valid, _ = repair_plate_text(text)
                if valid:
                    repaired_reads.append(repaired)
                    repaired_confidences.append(conf)
                    repaired_qualities.append(qual)

            if repaired_reads:
                aligned_repaired = align_plates_for_voting(repaired_reads)
                voted_plate, position_confs = position_wise_vote(
                    aligned_repaired,
                    repaired_confidences,
                    repaired_qualities,
                )
                repaired_plate, is_valid, changes = repair_plate_text(voted_plate)

        final_confidence = np.mean(position_confs) if position_confs else 0.0

        return VotingResult(
            plate_text=repaired_plate,
            confidence=final_confidence,
            character_confidences=position_confs,
            is_valid_format=is_valid,
            candidate_count=len(crops),
            raw_reads=raw_reads,
            quality_scores=quality_scores,
            frame_indices=list(range(len(crops))),
        )


# Convenience function for direct use
def vote_plates_icpr2026(
    crops: List[np.ndarray],
    ocr_results: List[Dict[str, Any]],
    **kwargs,
) -> VotingResult:
    """Convenience function to run ICPR 2026 voting."""
    voter = ICPRVoter(**kwargs)
    return voter.vote_track(crops, ocr_results)