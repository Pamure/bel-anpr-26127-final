"""Rule engine for Indian vehicle registration plates.

Knowledge source: docs/indian_plate_rules.md (from Wikipedia, MV Act 1988 + HSRP).

Core idea: instead of trusting the OCR's visual guess, enforce the strict
structural rules of the Indian RTO format to correct ambiguous characters
(0/Q, L/4, S/5, ...) and to validate the result against the real state code set.
"""
from difflib import SequenceMatcher

# ---------- knowledge: state / UT codes (since 1 July 1989) ----------
STATE_CODES = {
    "AN": "Andaman and Nicobar Islands", "AP": "Andhra Pradesh",
    "AR": "Arunachal Pradesh", "AS": "Assam", "BR": "Bihar",
    "CG": "Chhattisgarh", "CH": "Chandigarh",
    "DD": "Dadra and Nagar Haveli and Daman and Diu", "DL": "Delhi",
    "GA": "Goa", "GJ": "Gujarat", "HP": "Himachal Pradesh",
    "HR": "Haryana", "JH": "Jharkhand", "JK": "Jammu and Kashmir",
    "KA": "Karnataka", "KL": "Kerala", "LA": "Ladakh", "LD": "Lakshadweep",
    "MH": "Maharashtra", "ML": "Meghalaya", "MN": "Manipur", "MP": "Madhya Pradesh",
    "MZ": "Mizoram", "NL": "Nagaland", "OD": "Odisha", "PB": "Punjab",
    "PY": "Puducherry", "RJ": "Rajasthan", "SK": "Sikkim", "TG": "Telangana",
    "TN": "Tamil Nadu", "TR": "Tripura", "UK": "Uttarakhand", "UP": "Uttar Pradesh",
    "WB": "West Bengal",
}
FORMER_STATE_CODES = {
    "UA": "Uttaranchal (2000-2007, now UK)",
    "OR": "Orissa (1989-2012, now OD)",
    "DN": "Dadra and Nagar Haveli (1989-2020, merged into DD)",
    "TS": "Telangana (2014-2024, now TG)",
}
VALID_STATE_CODES = {**STATE_CODES, **FORMER_STATE_CODES}

# ---------- alphabet rules ----------
EXCLUDED = frozenset("IO")  # I and O are never used on Indian plates

# digit position: a letter-shaped glyph must be a digit
DIGIT_OF = {
    "O": "0", "Q": "0", "D": "0", "I": "1", "l": "1", "i": "1",
    "Z": "2", "z": "2", "E": "3", "A": "4", "L": "4", "H": "4",
    "S": "5", "s": "5", "G": "6", "g": "6", "T": "7", "t": "7",
    "B": "8", "b": "8",
}
# letter position: a digit-shaped glyph must be a letter
# (circle in a letter slot -> Q, since O is banned on Indian plates)
LETTER_OF = {
    "0": "Q", "1": "I", "2": "Z", "3": "E", "4": "A", "5": "S",
    "6": "G", "7": "T", "8": "B", "9": "G",
}


# ---------- low-level helpers ----------
def _class_ok(ch, kind):
    return ch.isalpha() if kind == "L" else ch.isdigit()


def _fix_char(ch, kind):
    """Force character into the expected class; None if impossible."""
    if _class_ok(ch, kind):
        return ch
    return (DIGIT_OF if kind == "D" else LETTER_OF).get(ch)


def _nearest_state(code):
    """Fuzzy state-code lookup (handles OCR damage like 'K4' -> 'KA')."""
    if len(code) != 2 or not code.isalpha():
        return None
    best, best_r = None, 0.7
    for cand, name in VALID_STATE_CODES.items():
        r = SequenceMatcher(None, code, cand).ratio()
        if r > best_r:
            best, best_r = name, r
    return best


def _state_score(code):
    if code in VALID_STATE_CODES:
        return 2.0, VALID_STATE_CODES[code]
    name = _nearest_state(code)
    return (1.0, name) if name else (0.0, None)


# ---------- private / commercial pattern ----------
def candidate_patterns(n):
    """All private/commercial patterns for a text of length n.
    Format: state(2) RTO(1-2) series(0-3, no I/O) number(4).
    RTO=1 is legal only for Delhi (no leading zero)."""
    out = []
    for rto in (2, 1):
        for series in range(0, 4):
            pat = "LL" + "D" * rto + "L" * series + "DDDD"
            if len(pat) == n:
                out.append((pat, rto, series))
    return out


def _try_private(flat, pattern, rto_len, series_len):
    chars, corrections, score = [], [], 0.0
    for i, (ch, kind) in enumerate(zip(flat, pattern)):
        fixed = _fix_char(ch, kind)
        if fixed is None:
            return None
        if fixed != ch:
            corrections.append((i, kind, fixed))
        else:
            score += 1.0
        chars.append(fixed)

    code = "".join(chars[:2])
    s, state = _state_score(code)
    score += s
    if rto_len == 1 and code != "DL":           # only Delhi may drop the RTO zero
        score -= 5.0
    if series_len == 0:                          # no-series plates are rare
        score -= 1.0

    series = "".join(chars[2 + rto_len:2 + rto_len + series_len])
    number = "".join(chars[2 + rto_len + series_len:])
    return {
        "category": "private/commercial", "label": "private",
        "plate": "".join(chars), "score": score, "corrections": corrections,
        "state_code": code, "state": state, "rto": "".join(chars[2:2 + rto_len]),
        "series": series, "number": number,
        "display": f"{code} {''.join(chars[2:2 + rto_len])} {series or '—'} {number}".replace(" —", ""),
    }


# ---------- special formats ----------
def _try_vintage(flat):
    """LL VA LL DDDD (10 chars)."""
    if len(flat) != 10 or flat[2:4] not in ("VA", "V4", "UA", "J/"):
        return None
    p = "LL" + "VL" + "LLDDDD"
    chars, fixes, score = [], [], 0.0
    for i, (ch, kind) in enumerate(zip(flat, p)):
        if kind == "L":
            fixed = _fix_char(ch, "L")
        elif ch in "VA":
            fixed = ch
        else:
            fixed = _fix_char(ch, "D")
        if fixed is None:
            return None
        if fixed != ch:
            fixes.append((i, "VA-series", fixed))
        else:
            score += 1.0
        chars.append(fixed)
    code = "".join(chars[:2])
    s, state = _state_score(code)
    score += s + 1.0
    return {
        "category": "vintage", "label": "vintage", "plate": "".join(chars),
        "score": score, "corrections": fixes, "state_code": code, "state": state,
        "series": "".join(chars[4:6]), "number": "".join(chars[6:]),
        "display": f"{code} VA {''.join(chars[4:6])} {''.join(chars[6:])}",
    }


def _try_bharat(flat):
    """DD BH DDDD L(1-2) (9-10 chars)."""
    if len(flat) not in (9, 10) or flat[2:4] != "BH":
        return None
    letters = flat[8:]
    if not all(c.isdigit() or _fix_char(c, "D") for c in flat[:2] + flat[4:8]):
        return None
    chars, fixes, score = [], [], 0.0
    for i, ch in enumerate(flat):
        if i in (2, 3):
            if ch != "BH"[i - 2]:
                fixes.append((i, "BH", "BH"[i - 2]))
                chars.append("BH"[i - 2])
            else:
                chars.append(ch)
                score += 1.0
        elif i < 8:
            fixed = _fix_char(ch, "D")
            if fixed is None:
                return None
            chars.append(fixed)
            score += 1.0 if fixed == ch else 0.0
            if fixed != ch:
                fixes.append((i, "D", fixed))
        else:
            fixed = _fix_char(ch, "L")
            if fixed is None:
                return None
            chars.append(fixed)
            score += 1.0 if fixed == ch else 0.0
            if fixed != ch:
                fixes.append((i, "L", fixed))
    return {
        "category": "bharat", "label": "bharat", "plate": "".join(chars),
        "score": score + 3.0, "corrections": fixes,
        "state_code": None, "state": None,
        "year": "".join(chars[:2]), "series": "".join(chars[8:]), "number": "".join(chars[4:8]),
        "display": f"{''.join(chars[:2])} BH {''.join(chars[4:8])} {''.join(chars[8:])}",
    }


_DIPLOMATIC_CODES = ("CD", "CC", "UN", "IOD")


def _try_diplomatic(flat):
    """DDD (CD|CC|UN|IOD) DDDD ; first/last fields have no leading zeros."""
    for code in _DIPLOMATIC_CODES:
        k = flat.find(code)
        if k <= 0 or not (k <= 3 and len(flat) - k - len(code) >= 1):
            continue
        head, tail = flat[:k], flat[k + len(code):]
        if len(head) > 3 or len(tail) > 4 or not head or not tail:
            continue
        hd = [_fix_char(c, "D") for c in head]
        td = [_fix_char(c, "D") for c in tail]
        if any(x is None for x in hd + td):
            continue
        fixes = [(i, "D", f) for i, (o, f) in enumerate(zip(head, hd)) if o != f]
        fixes += [(k + len(code) + i, "D", f) for i, (o, f) in enumerate(zip(tail, td)) if o != f]
        score = sum(1 for o, f in zip(head, hd) if o == f) + \
            sum(1 for o, f in zip(tail, td) if o == f) + 3.0
        return {
            "category": "diplomatic", "label": "diplomatic", "plate": flat,
            "score": score, "corrections": fixes, "state_code": None, "state": None,
            "mission": "".join(hd), "code": code, "number": "".join(td),
            "display": f"{''.join(hd)} {code} {''.join(td)}",
        }
    return None


def _try_armed(flat):
    """DD L DDDDDD L (10 chars) -- armed forces (no state code)."""
    if len(flat) != 10:
        return None
    fixes, chars = [], []
    for i, ch in enumerate(flat):
        kind = "D" if i in (0, 1, 3, 4, 5, 6, 7, 8) else "L"
        fixed = _fix_char(ch, kind)
        if fixed is None:
            return None
        chars.append(fixed)
        if fixed != ch:
            fixes.append((i, kind, fixed))
    score = sum(1 for a, b in zip(flat, chars) if a == b)
    return {
        "category": "armed_forces", "label": "armed", "plate": "".join(chars),
        "score": score + 1.0, "corrections": fixes, "state_code": None, "state": None,
        "year": "".join(chars[:2]), "class": chars[2], "serial": "".join(chars[3:9]),
        "check": chars[9],
        "display": f"↑ {''.join(chars[:2])}{chars[2]} {''.join(chars[3:9])}{chars[9]}",
    }


def _try_temporary(flat):
    """T MMYY LL DDDD L(1-2) (12-13 chars)."""
    if len(flat) not in (12, 13) or flat[0] != "T":
        return None
    fixes, chars = [], [flat[0]]
    for i, ch in enumerate(flat[1:], start=1):
        kind = "D" if i in (1, 2, 3, 4, 7, 8, 9, 10) else "L"
        fixed = _fix_char(ch, kind)
        if fixed is None:
            return None
        chars.append(fixed)
        if fixed != ch:
            fixes.append((i, kind, fixed))
    code = "".join(chars[5:7])
    s, state = _state_score(code)
    score = sum(1 for a, b in zip(flat, chars) if a == b) + s
    return {
        "category": "temporary", "label": "temporary", "plate": "".join(chars),
        "score": score + 1.0, "corrections": fixes, "state_code": code, "state": state,
        "month_year": "".join(chars[1:5]), "number": "".join(chars[7:11]),
        "series": "".join(chars[11:]),
        "display": f"T {''.join(chars[1:5])} {code} {''.join(chars[7:11])} {''.join(chars[11:])}",
    }


def _try_trade(flat):
    """LL DD L DDDD TC DDDD (15 chars)."""
    if len(flat) != 15:
        return None
    fixes, chars = [], []
    for i, ch in enumerate(flat):
        kind = "L" if i in (0, 1, 4, 9, 10) else "D"
        fixed = _fix_char(ch, kind)
        if fixed is None:
            return None
        chars.append(fixed)
        if fixed != ch:
            fixes.append((i, kind, fixed))
    if "".join(chars[9:11]) != "TC":
        return None
    code = "".join(chars[:2])
    s, state = _state_score(code)
    score = sum(1 for a, b in zip(flat, chars) if a == b) + s
    return {
        "category": "trade", "label": "trade", "plate": "".join(chars),
        "score": score + 2.0, "corrections": fixes, "state_code": code, "state": state,
        "category_letter": chars[4], "holder": "".join(chars[5:9]), "number": "".join(chars[11:]),
        "display": f"{code} {''.join(chars[2:4])} {chars[4]} {''.join(chars[5:9])} TC {''.join(chars[11:])}",
    }


# ---------- public API ----------
def correct_plate(flat):
    """Correct an OCR'd plate using every applicable Indian plate rule.

    flat: concatenated OCR output (no spaces), e.g. 'KA0LJ05657'.

    Returns a dict (category, label, plate, score, corrections, state_code,
    state, display, ...) for the best candidate, or None on no match.
    """
    clean = "".join(c for c in flat if c != " ")
    if not clean:
        return None

    candidates = []
    for fn in (_try_vintage, _try_bharat, _try_diplomatic,
               _try_armed, _try_temporary, _try_trade):
        r = fn(clean)
        if r:
            candidates.append(r)
    for pat, rto, series in candidate_patterns(len(clean)):
        r = _try_private(clean, pat, rto, series)
        if r:
            candidates.append(r)

    if not candidates:
        return None
    best = max(candidates, key=lambda r: (r["score"], -len(r["corrections"])))
    if best["score"] <= 0:
        return None
    return best


def validate_plate(plate):
    """Strictly validate a plate string; returns a list of problems ([] = valid)."""
    flat = plate.replace(" ", "").upper()
    if not flat:
        return ["empty"]
    r = correct_plate(flat)
    if r is None:
        return ["no pattern matches"]
    problems = []
    if r["state_code"] is not None and r["state"] is None:
        problems.append(f"state code {r['state_code']!r} not in valid set")
    if r["corrections"]:
        problems.append(f"needed OCR corrections: {r['corrections']}")
    return problems


def format_plate(seq):
    """Best-effort spaced formatting of a raw/corrected sequence."""
    if not seq:
        return seq
    r = correct_plate(seq) if not isinstance(seq, dict) else seq
    if r:
        return r["display"]
    return seq


def parse_plate(plate):
    """Return structured components for a valid plate (or None)."""
    r = correct_plate(plate.replace(" ", "").upper())
    if not r:
        return None
    out = {k: r.get(k) for k in (
        "category", "label", "state_code", "state", "rto", "series",
        "number", "display", "score", "corrections")}
    out.update({k: r.get(k) for k in (
        "year", "class", "serial", "check", "month_year", "mission",
        "code", "category_letter", "holder") if k in r})
    return out


def is_excluded(letter):
    """True if the letter may never appear on an Indian plate (I/O)."""
    return letter in EXCLUDED