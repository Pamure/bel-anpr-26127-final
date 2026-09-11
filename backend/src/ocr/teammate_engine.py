"""
Teammate OCR engine adapter — PP-OCRv5 + EasyOCR fallback + india_rules.

Vendored from work1/OCR code/ (teammate deliverable):
  teammate/ocr_pipeline.py  — paddle/easy engines, 2-row split, row assembly
  teammate/india_rules.py   — Indian RTO structural rule engine (banned I/O,
                              fuzzy state matching, private/commercial patterns)
  teammate/plate_corrector.py — additional correction helpers

Engine name: 'teammate'   (config: OCR_ENGINE=teammate)

Pipeline per crop:
  1. upscale crops narrower than 400px (2x cubic)
  2. split_lines() -> per-row crops (handles 2-row / commercial plates)
  3. PaddleOCR per row -> order_items() row-aware assembly; if best row conf
     < PADDLE_CONF_FALLBACK (0.55) -> EasyOCR fallback
  4. apply_rules() -> india_rules.correct_plate() final structural correction
Multi-frame (track) fusion then reuses the ICPR 2026 voter so the whole
system keeps one temporal-consensus layer.
"""
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np
import cv2

from .base import BaseOCREngine, OCRResult
from .syntax_repair import validate_plate_format

# Teammate module directory (mirrors their own sys.path pattern)
_TEAM_DIR = str(Path(__file__).resolve().parent / "teammate")
if _TEAM_DIR not in sys.path:
    sys.path.insert(0, _TEAM_DIR)

import ocr_pipeline as tp  # teammate pipeline helpers (imports india_rules)
import india_rules  # noqa: F401  (kept available for direct use/tests)


class TeammateOCREngine(BaseOCREngine):
    """PP-OCRv5 + EasyOCR fallback + india_rules, wrapped to our contract."""

    name = "teammate"

    def __init__(self, gpu: bool = True, paddle_conf_fallback: float = 0.55, **kwargs):
        self.gpu = gpu
        self.paddle_conf_fallback = paddle_conf_fallback
        self._paddle = None
        self._easy = None
        self._initialized = False

    # ----------------------------------------------------------------
    def _initialize(self) -> None:
        if self._initialized:
            return
        # Exact init recipe from teammate ocr_pipeline.init_ocr()
        os.environ["FLAGS_use_mkldnn"] = "0"
        from paddleocr import PaddleOCR
        self._paddle = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=True,
            lang="en",
            enable_mkldnn=False,
        )
        import easyocr
        self._easy = easyocr.Reader(["en"], gpu=self.gpu, verbose=False)
        self._initialized = True

    # ----------------------------------------------------------------
    def _recognize_image(self, img: np.ndarray) -> Dict[str, Any]:
        """Run the teammate single-image routine; returns raw assembly output."""
        # Clamp oversized crops on CPU to standard ANPR geometry (prevents multi-second sliding-window spikes)
        h, w = img.shape[:2]
        if h > 96 or w > 360:
            scale = min(96.0 / h, 360.0 / w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        elif w < 200:
            img = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        try:
            crops = tp.split_lines(img)
        except Exception:
            crops = [img]

        rows_text, rows_conf = [], []
        engine_used = "none"
        if len(crops) > 1:
            # multi-row plate: paddle first, fallback per-row threshold
            parts, confs, engines = [], [], []
            for crop in crops:
                t, c, _ = tp.order_items(tp._paddle_items(crop))
                engines.append("paddle" if t else "none")
                if t and c >= self.paddle_conf_fallback:
                    parts.append(t)
                    confs.append(c)
                else:
                    et, ec, _ = tp.order_items(tp._easy_items(crop))
                    parts.append(et)
                    confs.append(ec)
                    engines[-1] = "easy" if et else "none"
            if any(parts):
                rows_text = parts
                rows_conf = confs
                engine_used = max(engines, key=engines.count)
        else:
            t, c, _ = tp.order_items(tp._paddle_items(img))
            if t and c >= self.paddle_conf_fallback:
                rows_text, rows_conf, engine_used = [t], [c], "paddle"
            else:
                et, ec, _ = tp.order_items(tp._easy_items(img))
                rows_text, rows_conf, engine_used = ([et], [ec], "easy") if et else ([], [], "none")

        if not rows_text:
            return {"text": "", "confidence": 0.0, "engine": engine_used}

        flat = "".join(rows_text)
        raw_conf = max(rows_conf) if rows_conf else 0.0
        corrected, _label = tp.apply_rules(flat)  # india_rules structural fix

        return {
            "text": corrected,
            "raw_text": flat,
            "confidence": float(raw_conf),
            "engine": engine_used,
            "rows": len(rows_text),
        }

    # ----------------------------------------------------------------
    def recognize_single(self, crop: np.ndarray) -> Dict[str, Any]:
        """Contract-compliant single crop recognition."""
        start = time.perf_counter()
        if crop is None or crop.size == 0:
            return {"text": "", "confidence": 0.0, "character_confidences": [],
                    "quality": 0.0, "raw_results": [], "execution_time_ms": 0.0}
        try:
            self._initialize()
        except Exception as e:  # paddle/easy not installed in this env
            return {"text": "", "confidence": 0.0, "character_confidences": [],
                    "quality": 0.0, "raw_results": [], "error": str(e),
                    "execution_time_ms": (time.perf_counter() - start) * 1000}

        out = self._recognize_image(crop)
        text = out.get("text", "")
        conf = out.get("confidence", 0.0)
        return {
            "text": text,
            "confidence": conf,
            "character_confidences": [conf] * len(text) if text else [],
            "quality": 0.9,  # rule-corrected output treated as high-quality evidence
            "raw_results": out.get("raw_text", "").split() or ([text] if text else []),
            "engine": out.get("engine", "none"),
            "execution_time_ms": (time.perf_counter() - start) * 1000,
        }

    # ----------------------------------------------------------------
    def recognize_track(self, crops: List[np.ndarray]) -> OCRResult:
        """Per-crop teammate OCR fused by the ICPR 2026 multi-frame voter."""
        from .icpr_voter import ICPRVoter
        start = time.perf_counter()
        if not crops:
            return OCRResult(plate_text="", confidence=0.0, is_valid_format=False)

        results = [self.recognize_single(c) for c in crops]
        usable = [r for r in results if r.get("text")]
        if not usable:
            return OCRResult(plate_text="", confidence=0.0, candidate_count=0,
                             execution_time_ms=(time.perf_counter() - start) * 1000)

        voter = ICPRVoter()
        vote = voter.vote_track(crops, usable, quality_scores=[r.get("quality", 0.9) for r in usable])

        raw_reads = [r for res in usable for r in res.get("raw_results", [])]
        return OCRResult(
            plate_text=vote.plate_text,
            confidence=vote.confidence,
            character_confidences=vote.character_confidences,
            is_valid_format=validate_plate_format(vote.plate_text),
            candidate_count=len(usable),
            raw_reads=raw_reads,
            execution_time_ms=(time.perf_counter() - start) * 1000,
        )


# Convenience factory
def create_teammate_engine(**kwargs) -> TeammateOCREngine:
    return TeammateOCREngine(**kwargs)