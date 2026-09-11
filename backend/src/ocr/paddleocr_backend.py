import time
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from paddleocr import PaddleOCR

from .base import BaseOCREngine, OCRResult
from .syntax_repair import (
    repair_plate_text,
    validate_plate_format,
    align_plates_for_voting,
    position_wise_vote,
)


@dataclass
class FrameQualityMetrics:
    """Quality metrics for a single frame crop."""
    sharpness: float      # Laplacian variance
    contrast: float       # RMS contrast
    brightness: float     # Mean brightness
    snr: float           # Signal-to-noise ratio estimate
    overall: float       # Composite quality score (0-1)


class PaddleOCREngine(BaseOCREngine):
    """
    PaddleOCR implementation optimized for Indian license plates.
    
    Incorporates ICPR 2026 LRLPR competition best practices:
    - Multi-frame temporal consensus (5-8 frames per track)
    - Quality-weighted frame fusion
    - Position-wise character-level voting
    - Layout-constrained decoding (Indian format: AA##AAA####)
    - Advanced preprocessing: CLAHE + morphological + bilateral + super-resolution upscaling
    """

    name = "paddleocr"

    # Indian plate character whitelist
    PLATE_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

    # Minimum crop size for PaddleOCR
    MIN_HEIGHT = 48
    MIN_WIDTH = 120

    def __init__(
        self,
        lang: str = 'en',
        use_gpu: bool = True,
        use_angle_cls: bool = True,
        det_model_dir: Optional[str] = None,
        rec_model_dir: Optional[str] = None,
        cls_model_dir: Optional[str] = None,
        enable_mkldnn: bool = True,
        cpu_threads: int = 4,
        **kwargs,
    ):
        """
        Initialize PaddleOCR with optimized settings for license plates.
        
        Args:
            lang: Language code (en for English alphanumeric)
            use_gpu: Use GPU acceleration
            use_angle_cls: Enable text direction classifier
            det_model_dir: Custom detection model path
            rec_model_dir: Custom recognition model path
            cls_model_dir: Custom classification model path
            enable_mkldnn: Enable MKL-DNN for CPU acceleration
            cpu_threads: Number of CPU threads for inference
        """
        self.lang = lang
        self.use_gpu = use_gpu
        self.use_angle_cls = use_angle_cls

        # Initialize PaddleOCR
        self.ocr = PaddleOCR(
            lang=lang,
            use_gpu=use_gpu,
            use_angle_cls=use_angle_cls,
            det_model_dir=det_model_dir,
            rec_model_dir=rec_model_dir,
            cls_model_dir=cls_model_dir,
            enable_mkldnn=enable_mkldnn,
            cpu_threads=cpu_threads,
            show_log=False,
            use_space_char=False,
            drop_score=0.3,  # Drop low confidence detections
        )

        # Preprocessing components
        self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        self._morph_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        self._morph_kernel_large = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))

        # Target size for super-resolution upscaling (ICPR 2026: 4x upscale for LR plates)
        self.target_height = 128
        self.target_width = 320

    # ==================== PREPROCESSING PIPELINE (ICPR 2026) ====================

    def _compute_quality(self, crop: np.ndarray) -> FrameQualityMetrics:
        """Compute quality metrics for a plate crop (ICPR 2026 style)."""
        if crop is None or crop.size == 0:
            return FrameQualityMetrics(0, 0, 0, 0, 0)

        # Convert to grayscale
        if len(crop.shape) == 3:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            gray = crop

        # Sharpness: Laplacian variance
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Contrast: RMS contrast
        contrast = np.std(gray)

        # Brightness: Mean
        brightness = np.mean(gray)

        # SNR estimate: mean / std (avoid division by zero)
        snr = brightness / (contrast + 1e-6)

        # Normalize to 0-1 range (empirically tuned thresholds)
        sharpness_norm = min(sharpness / 500.0, 1.0)
        contrast_norm = min(contrast / 60.0, 1.0)
        brightness_norm = 1.0 - abs(brightness - 127) / 127.0  # Peak at 127
        snr_norm = min(snr / 10.0, 1.0)

        # Weighted composite (sharpness is most important for OCR)
        overall = (
            0.4 * sharpness_norm +
            0.25 * contrast_norm +
            0.2 * brightness_norm +
            0.15 * snr_norm
        )

        return FrameQualityMetrics(
            sharpness=sharpness_norm,
            contrast=contrast_norm,
            brightness=brightness_norm,
            snr=snr_norm,
            overall=overall,
        )

    def _super_resolve_upscale(self, crop: np.ndarray) -> np.ndarray:
        """
        Super-resolution style upscaling for low-resolution plates.
        ICPR 2026: 4x upscaling using cubic interpolation + edge preservation.
        """
        h, w = crop.shape[:2]
        
        # Calculate scale to reach target size
        scale_h = self.target_height / h
        scale_w = self.target_width / w
        scale = max(scale_h, scale_w, 2.0)  # Minimum 2x upscale

        new_w = int(w * scale)
        new_h = int(h * scale)

        # Cubic interpolation (best for text)
        upscaled = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        # Edge-preserving smoothing after upscale
        upscaled = cv2.bilateralFilter(upscaled, 9, 75, 75)

        return upscaled

    def _preprocess_icpr2026(self, crop: np.ndarray) -> Tuple[np.ndarray, FrameQualityMetrics]:
        """
        Full ICPR 2026 preprocessing pipeline:
        1. Quality assessment
        2. Super-resolution upscaling (for LR plates)
        3. CLAHE local contrast enhancement
        4. Morphological closing (connect broken characters)
        5. Bilateral filtering (noise reduction, edge preservation)
        6. Sharpening (unsharp mask)
        """
        if crop is None or crop.size == 0:
            return crop, FrameQualityMetrics(0, 0, 0, 0, 0)

        # Compute quality BEFORE preprocessing
        quality = self._compute_quality(crop)

        # Ensure 3 channels
        if len(crop.shape) == 2:
            crop = cv2.cvtColor(crop, cv2.COLOR_GRAY2BGR)

        # Step 1: Super-resolution upscaling for low-res plates
        if crop.shape[0] < self.MIN_HEIGHT or crop.shape[1] < self.MIN_WIDTH:
            crop = self._super_resolve_upscale(crop)

        # Step 2: Convert to grayscale for processing
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

        # Step 3: CLAHE - Contrast Limited Adaptive Histogram Equalization
        # Critical for handling glare, shadows, night conditions
        clahe = self._clahe.apply(gray)

        # Step 4: Morphological closing - connect broken character segments
        # Especially important for degraded/low-res plates
        closed = cv2.morphologyEx(clahe, cv2.MORPH_CLOSE, self._morph_kernel)

        # Step 5: Bilateral filter - noise reduction while preserving character edges
        filtered = cv2.bilateralFilter(closed, 9, 75, 75)

        # Step 6: Unsharp masking - sharpen character edges
        gaussian = cv2.GaussianBlur(filtered, (0, 0), 2.0)
        sharpened = cv2.addWeighted(filtered, 1.5, gaussian, -0.5, 0)

        # Step 7: Adaptive thresholding for binarization (optional, helps some cases)
        # binary = cv2.adaptiveThreshold(
        #     sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        # )

        # Convert back to BGR for PaddleOCR
        processed = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)

        return processed, quality

    # ==================== RECOGNITION METHODS ====================

    def recognize_single(self, crop: np.ndarray) -> Dict[str, Any]:
        """
        Recognize text from a single plate crop with full preprocessing.
        
        Returns:
            Dict with 'text', 'confidence', 'character_confidences', 'quality', 'raw_results'
        """
        start = time.perf_counter()

        # Preprocess
        processed, quality = self._preprocess_icpr2026(crop)

        # Run PaddleOCR
        try:
            results = self.ocr.ocr(processed, cls=self.use_angle_cls)
        except Exception as e:
            return {
                'text': '',
                'confidence': 0.0,
                'character_confidences': [],
                'quality': quality.overall,
                'raw_results': [],
                'error': str(e),
                'execution_time_ms': (time.perf_counter() - start) * 1000,
            }

        # Parse results
        if not results or not results[0]:
            return {
                'text': '',
                'confidence': 0.0,
                'character_confidences': [],
                'quality': quality.overall,
                'raw_results': [],
                'execution_time_ms': (time.perf_counter() - start) * 1000,
            }

        # Combine all detected text regions (PaddleOCR returns list of [bbox, (text, conf)])
        full_text = ''
        total_conf = 0.0
        char_confs = []
        raw_reads = []

        for line in results[0]:
            bbox, (text, conf) = line
            # Filter by whitelist
            clean_text = ''.join(c for c in text.upper() if c in self.PLATE_WHITELIST)
            if clean_text:
                full_text += clean_text
                total_conf += conf
                raw_reads.append(text)
                # Distribute confidence across characters
                for _ in clean_text:
                    char_confs.append(conf)

        avg_conf = total_conf / len(raw_reads) if raw_reads else 0.0
        elapsed = (time.perf_counter() - start) * 1000

        return {
            'text': full_text,
            'confidence': avg_conf,
            'character_confidences': char_confs,
            'quality': quality.overall,
            'raw_results': raw_reads,
            'execution_time_ms': elapsed,
        }

    def recognize_track(self, crops: List[np.ndarray]) -> OCRResult:
        """
        Multi-frame recognition with ICPR 2026 quality-weighted voting.
        
        Process:
        1. Preprocess and recognize each crop individually
        2. Compute quality metrics for each frame
        3. Align plates for position-wise voting
        4. Position-wise weighted voting (confidence * quality)
        5. Layout-constrained syntax repair (Indian format)
        6. Final validation
        """
        if not crops:
            return OCRResult(
                plate_text='',
                confidence=0.0,
                is_valid_format=False,
                candidate_count=0,
                execution_time_ms=0.0,
            )

        start = time.perf_counter()

        # Step 1: Recognize each crop with quality assessment
        single_results = []
        quality_scores = []

        for crop in crops:
            if crop is None or crop.size == 0:
                continue

            result = self.recognize_single(crop)
            if result['text']:
                single_results.append(result)
                quality_scores.append(result['quality'])

        if not single_results:
            return OCRResult(
                plate_text='',
                confidence=0.0,
                candidate_count=0,
                execution_time_ms=(time.perf_counter() - start) * 1000,
            )

        # Step 2: Extract texts and confidences
        texts = [r['text'] for r in single_results]
        confidences = [r['confidence'] for r in single_results]
        all_char_confs = [r.get('character_confidences', []) for r in single_results]
        raw_reads = []
        for r in single_results:
            raw_reads.extend(r.get('raw_results', []))

        # Step 3: Align plates for position-wise voting (using state code as anchor)
        aligned = align_plates_for_voting(texts)

        # Step 4: Position-wise weighted voting with quality weights
        voted_plate, position_confs = position_wise_vote(
            aligned,
            confidences,
            quality_scores[:len(aligned)] if quality_scores else None,
        )

        # Step 5: Apply Indian plate syntax repair (position-aware confusion correction)
        repaired_plate, is_valid, changes = repair_plate_text(voted_plate)

        # Step 6: If invalid, try repairing individual reads first, then vote
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

        # Step 7: Final character confidence (average of position confidences)
        final_confidence = np.mean(position_confs) if position_confs else 0.0

        elapsed = (time.perf_counter() - start) * 1000

        return OCRResult(
            plate_text=repaired_plate,
            confidence=final_confidence,
            character_confidences=position_confs,
            is_valid_format=is_valid,
            candidate_count=len(single_results),
            raw_reads=raw_reads,
            execution_time_ms=elapsed,
        )


# Convenience factory function
def create_paddleocr_engine(**kwargs) -> PaddleOCREngine:
    """Create PaddleOCR engine with default settings optimized for ANPR."""
    return PaddleOCREngine(**kwargs)