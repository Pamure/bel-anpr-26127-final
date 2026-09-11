import re
from typing import List, Tuple, Optional


INDIAN_STATE_CODES = frozenset([
    'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
    'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
    'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
    'SK', 'TN', 'TS', 'TR', 'UK', 'UP', 'WB'
])


PLATE_PATTERN = re.compile(r'^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$')


STATE_CODE_CONFUSION = {
    '0': 'O', '1': 'I', '5': 'S', '8': 'B', '4': 'A', '6': 'G', '2': 'Z'
}

DIGIT_CONFUSION = {
    'O': '0', 'I': '1', 'S': '5', 'B': '8', 'Z': '2', 'A': '4', 'G': '6',
    'D': '0', 'Q': '0', 'U': '0', 'Y': '4', 'T': '7', 'L': '1'
}


def normalize_raw(raw: str) -> str:
    """Normalize raw OCR output: uppercase, alphanumeric only.

    Strips EVERY non-alphanumeric character (spaces, hyphens, dots, quotes,
    backslashes, newlines, HTML/script payloads) — never trust OCR or input
    to be clean before it reaches SQL or regex.
    """
    return re.sub(r'[^A-Z0-9]', '', raw.upper())


def validate_state_code(code: str) -> Tuple[str, bool]:
    """Check if state code is valid, return corrected code and validity."""
    if len(code) != 2:
        return code, False
    if code in INDIAN_STATE_CODES:
        return code, True

    corrected = ''
    for i, ch in enumerate(code):
        if ch.isdigit() and ch in STATE_CODE_CONFUSION:
            corrected += STATE_CODE_CONFUSION[ch]
        else:
            corrected += ch

    return corrected, corrected in INDIAN_STATE_CODES


def repair_plate_text(text: str) -> Tuple[str, bool, List[str]]:
    """
    Apply position-aware confusion correction for Indian license plates.

    Indian format: [State:2 Alpha][District:2 Digit][Series:1-3 Alpha][Number:4 Digit]

    Returns:
        (corrected_text, is_valid_format, list_of_changes_made)
    """
    clean = normalize_raw(text)
    if len(clean) < 9 or len(clean) > 11:
        return clean, False, [f"Invalid length: {len(clean)}"]

    chars = list(clean)
    changes = []

    # Position 0-1: State code (must be letters)
    for i in range(2):
        if chars[i].isdigit() and chars[i] in STATE_CODE_CONFUSION:
            old = chars[i]
            chars[i] = STATE_CODE_CONFUSION[old]
            changes.append(f"pos {i}: {old} -> {chars[i]} (state code digit->letter)")

    # Position 2-3: District code (must be digits)
    for i in range(2, 4):
        if i < len(chars) and chars[i].isalpha() and chars[i] in DIGIT_CONFUSION:
            old = chars[i]
            chars[i] = DIGIT_CONFUSION[old]
            changes.append(f"pos {i}: {old} -> {chars[i]} (district letter->digit)")

    # Last 4 positions: Number (must be digits)
    for i in range(max(0, len(chars) - 4), len(chars)):
        if chars[i].isalpha() and chars[i] in DIGIT_CONFUSION:
            old = chars[i]
            chars[i] = DIGIT_CONFUSION[old]
            changes.append(f"pos {i}: {old} -> {chars[i]} (number letter->digit)")

    # Series positions (between district and last 4): must be letters
    series_start = 4
    series_end = len(chars) - 4
    for i in range(series_start, series_end):
        if i < len(chars) and chars[i].isdigit() and chars[i] in STATE_CODE_CONFUSION:
            old = chars[i]
            chars[i] = STATE_CODE_CONFUSION[old]
            changes.append(f"pos {i}: {old} -> {chars[i]} (series digit->letter)")

    corrected = ''.join(chars)
    is_valid = bool(PLATE_PATTERN.match(corrected))

    if is_valid:
        state_code = corrected[:2]
        is_valid = state_code in INDIAN_STATE_CODES

    return corrected, is_valid, changes


def validate_plate_format(text: str) -> bool:
    """Quick validation of Indian plate format."""
    clean = normalize_raw(text)
    if not PLATE_PATTERN.match(clean):
        return False
    return clean[:2] in INDIAN_STATE_CODES


def align_plates_for_voting(plates: List[str], target_length: int = 10) -> List[str]:
    """
    Align multiple plate reads to same length for position-wise voting.

    Uses state code as anchor (positions 0-1).
    """
    if not plates:
        return []

    normalized = [normalize_raw(p) for p in plates]
    aligned = []

    for plate in normalized:
        if len(plate) >= 9 and plate[:2] in INDIAN_STATE_CODES:
            aligned.append(plate)
        elif len(plate) >= 2:
            state = plate[:2]
            corrected_state, _ = validate_state_code(state)
            remainder = plate[2:]
            aligned.append(corrected_state + remainder)
        else:
            aligned.append(plate)

    return aligned


def position_wise_vote(
    aligned_plates: List[str],
    confidences: List[float],
    quality_scores: Optional[List[float]] = None
) -> Tuple[str, List[float]]:
    """
    Position-wise character voting with confidence weighting.

    Returns:
        (voted_plate, position_confidences)
    """
    if not aligned_plates:
        return "", []

    max_len = max(len(p) for p in aligned_plates)
    weights = []

    if quality_scores is None:
        quality_scores = [1.0] * len(aligned_plates)

    for i, (plate, conf, qual) in enumerate(zip(aligned_plates, confidences, quality_scores)):
        weights.append(conf * qual)

    voted_chars = []
    position_confs = []

    for pos in range(max_len):
        char_scores = {}
        for plate, weight in zip(aligned_plates, weights):
            if pos < len(plate):
                ch = plate[pos]
                char_scores[ch] = char_scores.get(ch, 0.0) + weight

        if char_scores:
            best_char = max(char_scores, key=char_scores.get)
            total = sum(char_scores.values())
            voted_chars.append(best_char)
            position_confs.append(char_scores[best_char] / total if total > 0 else 0.0)
        else:
            voted_chars.append('?')
            position_confs.append(0.0)

    return ''.join(voted_chars), position_confs