"""
OCR Module for BEL ANPR 26127

Exports:
- BaseOCREngine: Abstract interface for OCR engines
- OCRResult: Standardized result dataclass
- create_ocr_engine: Factory function
- PaddleOCREngine: PaddleOCR implementation with ICPR 2026 preprocessing (lazy-loaded)
- ICPRVoter: Multi-frame voting engine
- FriendOCREngine: Hot-swap stub for teammate models
- repair_plate_text: Indian plate syntax repair
- validate_plate_format: Plate format validation
"""

# Lightweight imports only — heavy engines (PaddleOCR) load lazily so that
# importing `ocr` never requires paddle/GPU at import time (tests, CI).
from .base import BaseOCREngine, OCRResult, create_ocr_engine
from .friend_model import FriendOCREngine
from .syntax_repair import (
    repair_plate_text,
    validate_plate_format,
    normalize_raw,
    align_plates_for_voting,
    position_wise_vote,
)

__all__ = [
    "BaseOCREngine",
    "OCRResult",
    "create_ocr_engine",
    "PaddleOCREngine",
    "ICPRVoter",
    "vote_plates_icpr2026",
    "FriendOCREngine",
    "repair_plate_text",
    "validate_plate_format",
    "normalize_raw",
    "align_plates_for_voting",
    "position_wise_vote",
]


def __getattr__(name):
    """PEP 562 lazy attributes for heavy modules."""
    if name == "PaddleOCREngine":
        from .paddleocr_backend import PaddleOCREngine
        return PaddleOCREngine
    if name in ("ICPRVoter", "vote_plates_icpr2026"):
        from .icpr_voter import ICPRVoter, vote_plates_icpr2026
        if name == "ICPRVoter":
            return ICPRVoter
        return vote_plates_icpr2026
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


# Default engine configuration
DEFAULT_ENGINE = "paddleocr"
AVAILABLE_ENGINES = ["paddleocr", "teammate", "friend"]