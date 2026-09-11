from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import numpy as np


@dataclass
class OCRResult:
    plate_text: str
    confidence: float
    character_confidences: List[float] = field(default_factory=list)
    is_valid_format: bool = False
    candidate_count: int = 0
    raw_reads: List[str] = field(default_factory=list)
    execution_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plate_text": self.plate_text,
            "confidence": round(float(self.confidence), 4),
            "character_confidences": [round(float(c), 3) for c in self.character_confidences],
            "is_valid_format": self.is_valid_format,
            "candidate_count": self.candidate_count,
            "raw_reads": self.raw_reads,
            "execution_time_ms": round(self.execution_time_ms, 2),
        }


class BaseOCREngine(ABC):
    """
    Abstract interface for license plate recognition engines.

    Teammates can implement their own engine by subclassing this class
    and implementing recognize_single() and recognize_track().

    Usage:
        engine = MyCustomOCREngine()
        result = engine.recognize_track(list_of_crops)
        print(result.to_dict())
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this engine (e.g., 'paddleocr', 'friend', 'lprnet')."""
        pass

    @abstractmethod
    def recognize_single(self, crop: np.ndarray) -> Dict[str, Any]:
        """
        Recognize text from a single plate crop.

        Args:
            crop: BGR image as numpy array (H, W, 3)

        Returns:
            Dict with keys: 'text' (str), 'confidence' (float),
            optionally 'character_confidences' (List[float]), 'quality' (float)
        """
        pass

    @abstractmethod
    def recognize_track(self, crops: List[np.ndarray]) -> OCRResult:
        """
        Recognize plate from multiple crops of the same vehicle track.

        This is where multi-frame fusion / voting happens.
        Default implementation calls recognize_single on each crop and
        applies simple confidence-weighted voting.

        Args:
            crops: List of BGR images as numpy arrays

        Returns:
            OCRResult with consensus plate text and metadata
        """
        pass


def create_ocr_engine(engine_name: str, **kwargs) -> BaseOCREngine:
    """
    Factory function to create OCR engine by name.

    Args:
        engine_name: One of 'paddleocr', 'friend'
        **kwargs: Engine-specific configuration

    Returns:
        BaseOCREngine instance
    """
    if engine_name == "paddleocr":
        from .paddleocr_backend import PaddleOCREngine
        return PaddleOCREngine(**kwargs)
    elif engine_name == "teammate":
        from .teammate_engine import TeammateOCREngine
        return TeammateOCREngine(**kwargs)
    elif engine_name == "friend":
        from .friend_model import FriendOCREngine
        return FriendOCREngine(**kwargs)
    else:
        raise ValueError(f"Unknown OCR engine: {engine_name}. Available: paddleocr, teammate, friend")