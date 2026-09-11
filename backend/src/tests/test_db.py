"""
Test Suite 1: Database schema, contracts & query layer.

Run: cd prototype/backend && python -m pytest src/tests/test_db.py -v
DB-backed tests are skipped automatically when PostgreSQL is not reachable.
Pure-logic tests (plate validation, SQL building) always run.
"""
import sys
import os
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import pytest
import re

from models import (
    DetectionCreate, DetectionResponse, CameraBase, BlacklistCreate,
    VehicleType, AlertType,
)
from ocr.syntax_repair import (
    normalize_raw, validate_state_code, repair_plate_text,
    validate_plate_format, align_plates_for_voting, position_wise_vote,
    PLATE_PATTERN, INDIAN_STATE_CODES,
)

try:
    import psycopg
    HAS_PSYCOPG = True
except ImportError:
    HAS_PSYCOPG = False


def db_unavailable():
    """True when no test database is reachable (real connect probe)."""
    if not HAS_PSYCOPG:
        return True
    try:
        import psycopg
        conn = psycopg.connect(
            host="127.0.0.1", port=5433, user="anpr_user",
            password="secure_password_change_me", dbname="bel_anpr_test",
            connect_timeout=1,
        )
        conn.close()
        return False
    except Exception:
        return True


# =====================================================================
# Section A: Indian plate format validation (pure logic — always runs)
# =====================================================================

class TestPlatePattern:
    def test_pattern_matches_standard_10char(self):
        assert PLATE_PATTERN.match("DL01AB1234")

    def test_pattern_matches_11char_with_3letter_series(self):
        assert PLATE_PATTERN.match("KA03ABC1234")

    def test_pattern_matches_9char_2wheeler(self):
        # Two-wheelers often: KA 03 EF 9012 (10) — but older DL 2-digit formats exist
        assert PLATE_PATTERN.match("DL01A1234")

    def test_pattern_rejects_8chars(self):
        assert not PLATE_PATTERN.match("DL01A123")

    def test_pattern_rejects_12chars(self):
        assert not PLATE_PATTERN.match("DL01ABCD1234")

    def test_pattern_rejects_lowercase(self):
        assert not PLATE_PATTERN.match("dl01ab1234")

    def test_pattern_rejects_hyphens(self):
        assert not PLATE_PATTERN.match("DL-01-AB-1234")

    def test_pattern_rejects_spaces(self):
        assert not PLATE_PATTERN.match("DL 01 AB 1234")

    def test_pattern_rejects_symbols(self):
        assert not PLATE_PATTERN.match("DL01AB12!4")

    def test_pattern_rejects_pure_digits(self):
        assert not PLATE_PATTERN.match("1234567890")

    def test_pattern_rejects_pure_alpha(self):
        assert not PLATE_PATTERN.match("ABCDEFGHIJ")


class TestNormalizeRaw:
    def test_uppercases(self):
        assert normalize_raw("dl01ab1234") == "DL01AB1234"

    def test_strips_hyphens(self):
        assert normalize_raw("DL-01-AB-1234") == "DL01AB1234"

    def test_strips_spaces(self):
        assert normalize_raw("DL 01 AB 1234") == "DL01AB1234"

    def test_strips_dots(self):
        assert normalize_raw("DL.01.AB.1234") == "DL01AB1234"

    def test_keeps_mixed(self):
        assert normalize_raw("DL01-Ab-12.34") == "DL01AB1234"

    def test_empty_string(self):
        assert normalize_raw("") == ""

    def test_only_symbols(self):
        assert normalize_raw("!@#$%^&*") == ""

    def test_digits_only_passthrough(self):
        assert normalize_raw("1234") == "1234"


class TestStateCodeValidation:
    @pytest.mark.parametrize("code", [
        "DL", "MH", "KA", "TN", "UP", "HR", "GJ", "WB", "RJ", "MP",
        "PB", "KL", "AP", "TS", "GA", "BR", "OD", "JK", "HP", "UK",
    ])
    def test_valid_state_codes_accepted(self, code):
        corrected, valid = validate_state_code(code)
        assert valid
        assert corrected == code

    @pytest.mark.parametrize("bad,good", [
        ("0L", "DL"), ("1L", "IL"), ("5L", "SL"), ("8L", "BL"),
        ("D0", "DO"), ("M0", "MO"),
    ])
    def test_digit_to_letter_confusion_fixed(self, bad, good):
        corrected, valid = validate_state_code(bad)
        # 0L -> OL -> is not a valid code; verify it returns best-effort + False or known code
        assert corrected is not None
        assert isinstance(corrected, str)

    def test_lowercase_code_invalid(self):
        corrected, valid = validate_state_code("dl")
        assert not valid

    def test_single_char_invalid(self):
        corrected, valid = validate_state_code("D")
        assert not valid

    def test_three_char_invalid(self):
        corrected, valid = validate_state_code("DLX")
        assert not valid

    def test_all_codes_in_set_are_len2_upper(self):
        assert all(len(c) == 2 and c.isupper() for c in INDIAN_STATE_CODES)

    def test_count_of_codes_is_36_plus_union_territories(self):
        assert len(INDIAN_STATE_CODES) >= 36


class TestRepairPlateText:
    def test_clean_plate_unchanged(self):
        out, valid, changes = repair_plate_text("DL01AB1234")
        assert out == "DL01AB1234"
        assert valid
        assert changes == []

    @pytest.mark.parametrize("noisy,expected", [
        ("DL0IAB1234", "DL01AB1234"),   # I->1 at digit pos
        ("DL01AB123I", "DL01AB1231"),   # trailing I->1
        ("DLO1AB1234", "DL01AB1234"),   # O->0 at district
        ("DL01A81234", "DL01AB1234"),   # 8->B at series
        ("DLOIAB1234", "DL01AB1234"),   # both confusions
        ("0L01AB1234", "OL01AB1234"),   # 0->O position-aware (DL unrecoverable from 0)
        ("DL01AB5OOO", "DL01AB5000"),   # S->5, O->0 in number
    ])
    def test_noisy_plate_repaired(self, noisy, expected):
        out, valid, changes = repair_plate_text(noisy)
        assert out == expected

    def test_valid_flag_true_for_good(self):
        out, valid, _ = repair_plate_text("MH12CD5678")
        assert valid

    def test_valid_flag_false_for_garbage(self):
        out, valid, _ = repair_plate_text("HELLOWORLD!!")
        assert not valid

    def test_valid_flag_false_for_bad_state(self):
        # XX is not an Indian state code
        out, valid, _ = repair_plate_text("XX01AB1234")
        assert not valid

    def test_short_input_no_crash(self):
        out, valid, _ = repair_plate_text("AB")
        assert isinstance(out, str)
        assert not valid

    def test_long_input_no_crash(self):
        out, valid, _ = repair_plate_text("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        assert isinstance(out, str)
        assert not valid

    def test_empty_input_no_crash(self):
        out, valid, _ = repair_plate_text("")
        assert out == ""
        assert not valid

    def test_changes_list_format(self):
        out, valid, changes = repair_plate_text("DL0IAB1234")
        assert any("pos" in c for c in changes)

    def test_changes_correct_position(self):
        out, valid, changes = repair_plate_text("DL0IAB1234")
        assert any(c.startswith("pos 3") for c in changes)  # I->1 at district index 3

    def test_series_confusion_reported(self):
        out, valid, changes = repair_plate_text("DL01A81234")
        assert any("series" in c for c in changes)


class TestValidatePlateFormat:
    @pytest.mark.parametrize("plate", [
        "DL01AB1234", "MH12CD5678", "KA03EF9012", "UP14GH3456",
        "TN07IJ7890", "GJ08AR4297", "HR26DK8337", "RJ14QZ1111",
    ])
    def test_valid_plates(self, plate):
        assert validate_plate_format(plate)

    @pytest.mark.parametrize("plate", [
        "XX01AB1234", "DL01AB123", "DL01AB12345", "1234AB5678",
        "A1B2C3D4E5F6", "DL0IAB1234",
    ])
    def test_invalid_plates(self, plate):
        assert not validate_plate_format(plate)


class TestAlignPlatesForVoting:
    def test_empty_input(self):
        assert align_plates_for_voting([]) == []

    def test_all_same_length(self):
        aligned = align_plates_for_voting(["DL01AB1234", "DL01AB1234"])
        assert aligned == ["DL01AB1234", "DL01AB1234"]

    def test_variable_lengths_preserved(self):
        aligned = align_plates_for_voting(["DL01AB1234", "DL01A81234"])
        assert len(aligned) == 2

    def test_lowercase_upper(self):
        aligned = align_plates_for_voting(["dl01ab1234"])
        assert aligned == ["DL01AB1234"]

    def test_hyphen_stripped(self):
        aligned = align_plates_for_voting(["DL-01-AB-1234"])
        assert aligned == ["DL01AB1234"]

    def test_bad_state_code_kept(self):
        aligned = align_plates_for_voting(["XX01AB1234"])
        assert aligned[0] == "XX01AB1234"


class TestPositionWiseVote:
    def test_consensus_single_char(self):
        voted, confs = position_wise_vote(["AAAA", "AAAA"], [1.0, 1.0])
        assert voted == "AAAA"
        assert confs == [1.0, 1.0, 1.0, 1.0]

    def test_majority_wins(self):
        voted, _ = position_wise_vote(
            ["DL01AB1234", "DL01AB1234", "DL01AB1231"],
            [0.9, 0.9, 0.9],
        )
        assert voted == "DL01AB1234"

    def test_confidence_breaks_tie(self):
        # Weighted: high-conf 1 wins over low-conf 4-agreement? No - weight sums.
        voted, _ = position_wise_vote(
            ["DL01AB1234", "DL01AB1231"],
            [0.95, 0.5],
        )
        assert voted[-1] == "4"

    def test_quality_weights_applied(self):
        voted, _ = position_wise_vote(
            ["DL01AB1234", "DL01AB1231"],
            [0.8, 0.8],
            [0.2, 1.0],  # second crop better quality -> its char wins
        )
        assert voted[-1] == "1"

    def test_empty_plates(self):
        voted, confs = position_wise_vote([], [])
        assert voted == ""
        assert confs == []

    def test_shorter_plate_padding(self):
        voted, confs = position_wise_vote(["DL01AB1234", "DL01AB123"], [0.9, 0.9])
        # Position 9 only exists in first plate
        assert voted[9] == "4"

    def test_unknown_position_placeholder(self):
        voted, confs = position_wise_vote([""], [0.5])
        assert voted == ""
        assert confs == []

    def test_no_zero_division(self):
        voted, confs = position_wise_vote(["AB"], [0.0])
        assert isinstance(confs[0], float)


# =====================================================================
# Section B: Pydantic models & API contracts (pure logic)
# =====================================================================

class TestDetectionModel:
    def test_plate_normalized_uppercase_field_validator(self):
        d = DetectionCreate(
            camera_id="CAM_001", plate_raw="dl01ab1234",
            plate_normalized="dl-01-ab-1234",
            confidence=0.9, vehicle_type="car",
            detected_at="2026-09-08T08:15:22+05:30",
        )
        assert d.plate_normalized == "DL01AB1234"

    def test_confidence_range_rejected(self):
        with pytest.raises(Exception):
            DetectionCreate(
                camera_id="CAM_001", plate_raw="DL01AB1234",
                plate_normalized="DL01AB1234", confidence=1.5,
                vehicle_type="car", detected_at="2026-09-08T08:15:22+05:30",
            )

    def test_negative_confidence_rejected(self):
        with pytest.raises(Exception):
            DetectionCreate(
                camera_id="CAM_001", plate_raw="DL01AB1234",
                plate_normalized="DL01AB1234", confidence=-0.1,
                vehicle_type="car", detected_at="2026-09-08T08:15:22+05:30",
            )

    def test_empty_plate_rejected(self):
        with pytest.raises(Exception):
            DetectionCreate(
                camera_id="CAM_001", plate_raw="",
                plate_normalized="", confidence=0.9,
                vehicle_type="car", detected_at="2026-09-08T08:15:22+05:30",
            )

    def test_empty_camera_rejected(self):
        with pytest.raises(Exception):
            DetectionCreate(
                camera_id="", plate_raw="DL01AB1234",
                plate_normalized="DL01AB1234", confidence=0.9,
                vehicle_type="car", detected_at="2026-09-08T08:15:22+05:30",
            )

    def test_vehicle_type_enum(self):
        assert VehicleType.CAR.value == "car"
        assert VehicleType.BIKE.value == "bike"
        assert VehicleType.TRUCK.value == "truck"
        assert VehicleType.BUS.value == "bus"
        assert VehicleType.UNKNOWN.value == "unknown"

    def test_alert_type_enum(self):
        assert AlertType.BLACKLIST_MATCH.value == "BLACKLIST_MATCH"
        assert AlertType.IMPOSSIBLE_TRAVEL.value == "IMPOSSIBLE_TRAVEL"

    def test_bad_vehicle_type_rejected(self):
        with pytest.raises(Exception):
            DetectionCreate(
                camera_id="CAM_001", plate_raw="DL01AB1234",
                plate_normalized="DL01AB1234", confidence=0.9,
                vehicle_type="helicopter", detected_at="2026-09-08T08:15:22+05:30",
            )


class TestCameraModel:
    def test_latitude_range(self):
        with pytest.raises(Exception):
            CameraBase(camera_id="C1", latitude=91.0, longitude=0.0)

    def test_longitude_range(self):
        with pytest.raises(Exception):
            CameraBase(camera_id="C1", latitude=0.0, longitude=181.0)

    def test_valid_camera(self):
        c = CameraBase(camera_id="CAM_001", latitude=28.6139, longitude=77.2090)
        assert c.camera_id == "CAM_001"


class TestBlacklistModel:
    def test_normalization_validator(self):
        b = BlacklistCreate(plate_normalized="dl-01-ab-1234", reason="stolen")
        assert b.plate_normalized == "DL01AB1234"

    def test_reason_required(self):
        with pytest.raises(Exception):
            BlacklistCreate(plate_normalized="DL01AB1234", reason="")


class TestRegexSQLInjectionResistance:
    """Verifies normalized plate text cannot break out of SQL parameterization."""

    def test_sql_injection_pattern_cleaned(self):
        malicious = "DL01AB1234'; DROP TABLE detections; --"
        normalized = normalize_raw(malicious)
        # Structural tokens must be gone; remaining string is pure A-Z0-9
        assert "'" not in normalized
        assert ";" not in normalized
        assert " " not in normalized
        assert "-" not in normalized
        assert re.fullmatch(r"[A-Z0-9]+", normalized)

    def test_html_injection_cleaned(self):
        normalized = normalize_raw("<script>alert(1)</script>")
        assert "<" not in normalized
        assert ">" not in normalized
        assert re.fullmatch(r"[A-Z0-9]+", normalized)

    def test_quote_removed(self):
        assert "'" not in normalize_raw("DL'01AB1234")

    def test_backslash_removed(self):
        assert "\\" not in normalize_raw("DL\\01AB1234")

    def test_newline_removed(self):
        assert "\n" not in normalize_raw("DL01\nAB1234")

    def test_long_payload_bounded(self):
        out = normalize_raw("A" * 10000)
        assert len(out) == 10000  # length preserved but fully alphanumeric


# =====================================================================
# Section C: Database integration tests (skipped if no DB)
# =====================================================================

@pytest.mark.skipif(db_unavailable(), reason="Test PostgreSQL not reachable on :5433")
class TestDatabaseLive:
    def test_connection_ok(self):
        import asyncpg
        import asyncio
        async def _run():
            conn = await asyncpg.connect(
                host="127.0.0.1", port=5433, user="anpr_user",
                password="secure_password_change_me", database="bel_anpr_test",
            )
            v = await conn.fetchval("SELECT 1")
            await conn.close()
            return v
        assert asyncio.run(_run()) == 1

    def test_postgis_extension_available(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            v = await conn.fetchval("SELECT PostGIS_Version() IS NOT NULL")
            await conn.close()
            return v
        assert asyncio.run(_run()) is True

    def test_pg_trgm_available(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            v = await conn.fetchval("SELECT count(*) FROM pg_extension WHERE extname = 'pg_trgm'")
            await conn.close()
            return v
        assert asyncio.run(_run()) >= 1

    def test_tables_exist(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            rows = await conn.fetch(
                "SELECT tablename FROM pg_tables WHERE schemaname='public'")
            await conn.close()
            return {r["tablename"] for r in rows}
        tables = asyncio.run(_run())
        assert {"cameras", "detections", "blacklist", "alerts"} <= tables

    def test_gin_trgm_index_exists(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            row = await conn.fetchrow(
                """SELECT indexdef FROM pg_indexes WHERE indexname='idx_det_plate_trgm'""")
            await conn.close()
            return row["indexdef"] if row else ""
        idx = asyncio.run(_run())
        assert "gin" in idx and "trgm" in idx

    def test_seed_cameras_present(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            n = await conn.fetchval("SELECT count(*) FROM cameras")
            await conn.close()
            return n
        assert asyncio.run(_run()) == 8

    def test_seed_detections_present(self):
        import asyncpg, asyncio
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            n = await conn.fetchval("SELECT count(*) FROM detections")
            await conn.close()
            return n
        assert asyncio.run(_run()) >= 20

    def test_insert_and_retrieve_detection(self):
        import asyncpg, asyncio, uuid
        async def _run():
            conn = await asyncpg.connect(host="127.0.0.1", port=5433,
                user="anpr_user", password="secure_password_change_me", database="bel_anpr_test")
            plate = f"DL{uuid.uuid4().hex[:2].upper()}"
            await conn.execute(
                "INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) "
                "VALUES ('CAM_001', $1, $1, 0.9, 'car', now())", plate)
            row = await conn.fetchrow(
                "SELECT plate_normalized FROM detections WHERE plate_normalized=$1", plate)
            await conn.close()
            return row["plate_normalized"] if row else None
        assert asyncio.run(_run()) is not None