import os
import sys
from pathlib import Path

# Ensure backend/src is importable regardless of CWD
SRC = Path(__file__).resolve().parents[1]
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

# Test defaults (never touch real env values during tests)
os.environ.setdefault("DATABASE_URL", "postgresql://anpr_user:test_password@localhost:5433/bel_anpr_test")
os.environ.setdefault("API_KEY", "test-api-key")
os.environ.setdefault("OSRM_BASE_URL", "http://127.0.0.1:5000")
os.environ.setdefault("OCR_ENGINE", "friend")  # never auto-load paddle models in tests

import pytest
from config import settings  # noqa: E402


@pytest.fixture
def sample_detection_payload():
    return {
        "camera_id": "CAM_001",
        "plate_raw": "dl01ab1234",
        "confidence": 0.94,
        "vehicle_type": "car",
        "detected_at": "2026-09-08T08:15:22+05:30",
    }


@pytest.fixture
def sample_plate_variants():
    """OCR noise variants of DL01AB1234."""
    return [
        "DL01AB1234",
        "DL01AB1234",
        "DL01AB1234",
        "DL0IAB1234",  # I vs 1 confusion
        "DL01A81234",  # B vs 8 confusion
    ]


@pytest.fixture
def sample_plates():
    return [
        "DL01AB1234",
        "MH12CD5678",
        "KA03EF9012",
        "UP14GH3456",
        "TN07IJ7890",
        "GJ08AR4297",
        "HR26DK8337",
        "RJ14QZ1111",
    ]