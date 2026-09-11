"""
Hot-swap stub for teammate's custom OCR model.

Instructions for teammates:
1. Replace this file with your custom implementation
2. Inherit from BaseOCREngine (from .base)
3. Implement recognize_single() and recognize_track()
4. Set OCR_ENGINE=friend in .env or config.py
5. Your model will be used automatically
"""

import time
import numpy as np
from typing import List, Dict, Any, Optional

from .base import BaseOCREngine, OCRResult


class FriendOCREngine(BaseOCREngine):
    """
    Placeholder for teammate's custom OCR engine.
    
    Replace this class with your actual implementation.
    The interface must match BaseOCREngine exactly.
    """

    name = "friend"

    def __init__(self, model_path: Optional[str] = None, **kwargs):
        """
        Initialize your custom model here.
        
        Args:
            model_path: Path to your model weights (ONNX, PyTorch, TensorRT, etc.)
            **kwargs: Additional configuration parameters
        """
        self.model_path = model_path
        self.kwargs = kwargs
        self._model = None
        self._initialized = False

    def _initialize(self):
        """Lazy initialization of your model."""
        if self._initialized:
            return

        # TODO: Replace with your model loading code
        # Examples:
        # import onnxruntime as ort
        # self._model = ort.InferenceSession(self.model_path)
        #
        # import torch
        # self._model = torch.jit.load(self.model_path)
        #
        # from your_module import YourModel
        # self._model = YourModel.load(self.model_path)

        print(f"[FriendOCREngine] Loading model from: {self.model_path}")
        print("[FriendOCREngine] WARNING: Using stub implementation - replace with real model!")

        self._initialized = True

    def recognize_single(self, crop: np.ndarray) -> Dict[str, Any]:
        """
        Recognize text from a single plate crop.
        
        MUST return dict with:
        - 'text': str (recognized plate text)
        - 'confidence': float (0.0-1.0)
        - 'character_confidences': List[float] (per-character confidence)
        - 'quality': float (frame quality 0.0-1.0)
        - 'raw_results': List[str] (raw detections)
        """
        self._initialize()

        # TODO: Replace with your actual inference
        # Example:
        # input_tensor = self._preprocess(crop)
        # outputs = self._model.run(None, {'input': input_tensor})
        # text, conf, char_confs = self._postprocess(outputs)
        # quality = self._compute_quality(crop)
        # return {'text': text, 'confidence': conf, 'character_confidences': char_confs, 'quality': quality, 'raw_results': [text]}

        # Stub implementation - returns empty result
        # Replace this entirely with your model
        return {
            'text': '',
            'confidence': 0.0,
            'character_confidences': [],
            'quality': 0.0,
            'raw_results': [],
            'execution_time_ms': 0.0,
        }

    def recognize_track(self, crops: List[np.ndarray]) -> OCRResult:
        """
        Multi-frame recognition for a vehicle track.
        
        You can implement your own temporal fusion here, or use the
        provided ICPR 2026 voter from .icpr_voter module.
        
        Returns:
            OCRResult with consensus plate text
        """
        self._initialize()

        if not crops:
            return OCRResult(
                plate_text='',
                confidence=0.0,
                is_valid_format=False,
                candidate_count=0,
                execution_time_ms=0.0,
            )

        # Option 1: Use the built-in ICPR 2026 voter (recommended)
        # from .icpr_voter import ICPRVoter
        # from .paddleocr_backend import PaddleOCREngine
        # 
        # paddle_ocr = PaddleOCREngine()
        # single_results = [paddle_ocr.recognize_single(c) for c in crops]
        # voter = ICPRVoter()
        # vote_result = voter.vote_track(crops, single_results)
        # return OCRResult(...)

        # Option 2: Your own temporal fusion
        # results = [self.recognize_single(c) for c in crops]
        # consensus = self._temporal_fusion(results)
        # return OCRResult(...)

        # Stub: process first crop only
        start = time.perf_counter()
        single = self.recognize_single(crops[0])

        return OCRResult(
            plate_text=single.get('text', ''),
            confidence=single.get('confidence', 0.0),
            character_confidences=single.get('character_confidences', []),
            is_valid_format=False,
            candidate_count=1,
            raw_reads=single.get('raw_results', []),
            execution_time_ms=(time.perf_counter() - start) * 1000,
        )


# Alternative: If teammate provides a completely different interface,
# create an adapter class:
#
# class FriendAdapter(BaseOCREngine):
#     """Adapter for teammate's existing OCR class with different interface."""
#     
#     name = "friend"
#     
#     def __init__(self):
#         from teammate_module import TeammateOCRClass
#         self._engine = TeammateOCRClass()
#     
#     def recognize_single(self, crop):
#         result = self._engine.predict(crop)  # Their API
#         return {
#             'text': result.plate,
#             'confidence': result.score,
#             'character_confidences': result.char_scores,
#             'quality': 1.0,
#             'raw_results': [result.plate],
#         }
#     
#     def recognize_track(self, crops):
#         results = [self.recognize_single(c) for c in crops]
#         # Your fusion logic here
#         best = max(results, key=lambda x: x['confidence'])
#         return OCRResult(...)