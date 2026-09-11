"""Position-aware post-OCR correction for Indian plates.

Fixes OCR mistakes that break the STRUCTURE of a real plate:
  - a digit where a letter must be (state/series/BH slots)  -> most likely letter
  - a letter where a digit must be (RTO/number slots)       -> most likely digit
  - '0D' -> 'OD', '8'/'4' -> 'B'/'H' in BH plates, stray 'IND' badge text,
    one spurious extra char (deletion candidates).

Scoring prefers candidates that keep the OCR characters (cost 0) and that
form a valid state code (+2.5) or BH plate (+4). Corrections cost a small
confusion-likelihood penalty. If nothing structurally better is found, the
raw string is returned unchanged.
"""

import sys

from india_rules import VALID_STATE_CODES

# digit char -> [(letter, cost)] used in LETTER slots
LETTER_FROM_DIGIT = {
    "0": [("O", 0.1), ("Q", 0.6), ("D", 0.9)],
    "1": [("I", 0.2)],
    "2": [("Z", 0.3)],
    "3": [("E", 0.4)],
    "4": [("A", 0.3)],
    "5": [("S", 0.3)],
    "6": [("G", 0.3)],
    "7": [("T", 0.5)],
    "8": [("B", 0.3)],
    "9": [("G", 0.8)],
}

# letter char -> [(digit, cost)] used in DIGIT slots
DIGIT_FROM_LETTER = {
    "O": [("0", 0.1)], "Q": [("0", 0.6)], "D": [("0", 0.4)],
    "I": [("1", 0.2)], "l": [("1", 0.2)], "i": [("1", 0.2)], "L": [("1", 0.5)],
    "Z": [("2", 0.3)], "z": [("2", 0.3)], "E": [("3", 0.4)],
    "A": [("4", 0.3)], "H": [("4", 0.8)],
    "S": [("5", 0.3)], "s": [("5", 0.3)],
    "G": [("6", 0.3)], "g": [("6", 0.3)],
    "T": [("7", 0.5)], "t": [("7", 0.5)],
    "B": [("8", 0.3)], "b": [("8", 0.3)],
}

# letter char -> [(letter, cost)] used in STATE slots only (pos 0-1),
# where an invalid 2-letter pair forces a change (e.g. OL -> DL, DD -> OD)
STATE_LETTER_CONF = {
    "O": [("D", 0.2)],
    "D": [("O", 0.2)],
    "C": [("G", 0.3)],
    "G": [("C", 0.3)],
}

STATE_BONUS = 2.5
BH_BONUS = 2.0
DELETE_PEN = 1.2
INSERT_PEN = 1.3
RTO_00_PEN = 1.2
RTO1_NONDL_PEN = 1.5
NO_SERIES_PEN = 0.3
INSERT_CHARS = "ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789"

# Popularity prior from Vahan registration data (new registrations by state,
# team-bhp 2025 ranking + known UT sizes). Used ONLY as a tie-breaker between
# structurally valid interpretations (e.g. OD vs DD vs LD).
STATE_PRIOR = {
    "OD": 0.32, "MH": 0.30, "UP": 0.28, "GJ": 0.26, "DL": 0.26, "HR": 0.24,
    "KA": 0.24, "TN": 0.24, "RJ": 0.22, "KL": 0.22, "MP": 0.20, "TG": 0.20,
    "PB": 0.18, "WB": 0.18, "BR": 0.16, "AP": 0.16, "CG": 0.14, "AS": 0.14,
    "JH": 0.14, "TS": 0.12, "UK": 0.10, "HP": 0.08, "JK": 0.08, "GA": 0.06,
    "CH": 0.06, "PY": 0.04, "TR": 0.02, "ML": 0.00, "MN": 0.00, "NL": 0.00,
    "MZ": 0.00, "SK": 0.00, "AR": 0.00, "AN": -0.30, "LA": -0.40,
    "LD": -0.40, "DD": -0.40, "DN": -0.40, "UA": 0.00, "OR": -0.20,
}


def _clean(flat):
    s = "".join(c for c in flat.upper() if c.isalnum())
    while s.startswith("INDIA"):
        s = s[5:]
    while s.startswith("IND"):
        s = s[3:]
    return s


def _patterns_for(n):
    pats = []
    for rto in (2, 1):
        for ser in range(0, 4):
            for num in (4, 3):
                p = "LL" + "D" * rto + "L" * ser + "D" * num
                if len(p) == n:
                    pats.append({"name": "private", "pat": p, "rto": rto,
                                 "ser": ser, "num": num})
    for k in (1, 2):
        p = "DD" + "LL" + "DDDD" + "L" * k
        if len(p) == n:
            pats.append({"name": "bharat", "pat": p, "rto": 0, "ser": 0, "num": 4})
    return pats


def _opts(ch, kind, pos, meta):
    if kind == "L":
        if meta["name"] == "bharat" and pos == 2:
            return [("B", 0.0 if ch == "B" else 0.3)]
        if meta["name"] == "bharat" and pos == 3:
            return [("H", 0.0 if ch == "H" else 0.3)]
        if ch.isalpha():
            if pos < 2:
                return [(ch, 0.0)] + STATE_LETTER_CONF.get(ch, [])
            return [(ch, 0.0)]
        alts = LETTER_FROM_DIGIT.get(ch, [])
        if pos < 2:
            return alts
        return [(a, c) for a, c in alts if a not in ("I", "O")]
    else:
        if ch.isdigit():
            return [(ch, 0.0)]
        return DIGIT_FROM_LETTER.get(ch, [])


def _beam(flat, meta, width=24):
    beam = [("", 0.0)]
    for pos, kind in enumerate(meta["pat"]):
        opts = _opts(flat[pos], kind, pos, meta)
        if not opts:
            return []
        nxt = []
        for s, c in beam:
            for o, oc in opts:
                nxt.append((s + o, c + oc))
        nxt.sort(key=lambda x: x[1])
        beam = nxt[:width]
    return beam


def _score(cand, cost, meta):
    s = -cost
    if meta["name"] == "bharat":
        if cand[2:4] == "BH":
            s += BH_BONUS
        return s
    code = cand[:2]
    if code in VALID_STATE_CODES:
        s += STATE_BONUS + STATE_PRIOR.get(code, 0.0)
    if meta["rto"] == 2 and cand[2:4] == "00":
        s -= RTO_00_PEN
    if meta["rto"] == 1 and code != "DL":
        s -= RTO1_NONDL_PEN
    if meta["ser"] == 0:
        s -= NO_SERIES_PEN
    return s


def correct(flat):
    """Return the structurally-best corrected plate string (or raw)."""
    if not flat:
        return flat
    raw = _clean(flat)
    if not raw:
        return flat

    def search(variants):
        best_cand, best_score = raw, -1e9
        for v, pen in variants:
            for meta in _patterns_for(len(v)):
                for cand, cost in _beam(v, meta):
                    sc = _score(cand, cost + pen, meta)
                    if sc > best_score:
                        best_score, best_cand = sc, cand
        return best_cand, best_score

    variants = [(raw, 0.0)]
    if len(raw) >= 8:
        variants += [(raw[:k] + raw[k + 1:], DELETE_PEN) for k in range(len(raw))]
    cand, sc = search(variants)
    if sc >= 1.0:
        return cand

    if 7 <= len(raw) <= 12:
        ins = []
        for k in range(len(raw) + 1):
            for ch in INSERT_CHARS:
                pen = INSERT_PEN + (0.5 if k < len(raw) and ch == raw[k] else 0.0)
                ins.append((raw[:k] + ch + raw[k:], pen))
        cand2, sc2 = search(ins)
        if sc2 > sc and sc2 > 0.0:
            return cand2

    return cand if sc > 0.0 else raw


def correct_batch(texts):
    return [correct(t) for t in texts]


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(f"{arg!r:24s} -> {correct(arg)!r}")
