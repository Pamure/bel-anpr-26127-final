"""Approach 1: PaddleOCR (PP-OCRv5) + EasyOCR fallback + india_rules correction.

Input : High_relevance/user_rectified/*.jpg (warped plate crops)
Output: High_relevance/ocr_results.csv  (per-file report)
        + console summary (exact-match %, CER, per-category)

Ground truth = plate text embedded in the filename (e.g. "AP 03TE 2796_cropped_warped.jpg").
"""

import argparse
import csv
import os
import re
import sys
from pathlib import Path

os.environ["FLAGS_use_mkldnn"] = "0"

import numpy as np
import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent))
import india_rules

HIGH_REL = Path(__file__).resolve().parent
INPUT_DIR = HIGH_REL / "user_rectified"
CSV_OUT = HIGH_REL / "ocr_results.csv"

PADDLE_CONF_FALLBACK = 0.55  # below this -> try EasyOCR


# ---------------- ground truth from filename ----------------
def gt_from_stem(stem):
    s = stem
    while True:
        s2 = re.sub(r"(\.rf\.[0-9a-f]+|_jpg|_png|_cropped|_warped|\s*\(\d+\))$", "", s)
        if s2 == s:
            break
        s = s2
    s = "".join(ch for ch in s if ch.isalnum())
    return s.upper()


# ---------------- OCR engines ----------------
_paddle = None
_easy = None


def init_ocr():
    global _paddle, _easy
    from paddleocr import PaddleOCR
    _paddle = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=True,
        lang="en",
        enable_mkldnn=False,
    )
    import easyocr
    _easy = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _paddle, _easy


def _paddle_items(img):
    res = _paddle.predict(img)
    if not res:
        return []
    r = res[0]
    try:
        texts = list(r["rec_texts"])
        scores = list(r["rec_scores"])
        polys = r.get("rec_polys") or r.get("dt_polys") or []
    except Exception:
        return []
    items = []
    for t, s, poly in zip(texts, scores, polys):
        poly = np.asarray(poly, np.float64).reshape(-1, 2)
        cx, cy = poly.mean(axis=0)
        h = float(np.linalg.norm(poly[2] - poly[0]) + np.linalg.norm(poly[3] - poly[1])) / 2.0
        items.append((str(t), float(s), cy, cx, h))
    return items


def _easy_items(img):
    try:
        out = _easy.readtext(img)
    except Exception:
        return []
    items = []
    for bbox, text, conf in out:
        bbox = np.asarray(bbox, np.float64).reshape(-1, 2)
        cx, cy = bbox.mean(axis=0)
        h = float(np.linalg.norm(bbox[2] - bbox[0]) + np.linalg.norm(bbox[3] - bbox[1])) / 2.0
        items.append((str(text), float(conf), cy, cx, h))
    return items


# ---------------- line split (robust for 2-row plates) ----------------
def split_lines(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.count_nonzero(bw) > 0.5 * bw.size:
        bw = 255 - bw
    prof = (bw > 0).sum(axis=1).astype(np.float64)
    thr = max(2.0, 0.05 * prof.max())
    active = prof > thr
    bands = []
    y = 0
    h = len(active)
    while y < h:
        if active[y]:
            y0 = y
            while y < h and active[y]:
                y += 1
            bands.append([y0, y])
        else:
            y += 1
    if not bands:
        return [img]
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < max(3, 0.04 * h):
            merged[-1][1] = b[1]
        else:
            merged.append(list(b))
    if len(merged) < 2:
        return [img]
    crops = []
    for y0, y1 in merged:
        pad = int(0.03 * h)
        crops.append(img[max(0, y0 - pad):min(h, y1 + pad), :])
    return crops


def _drop_badge(items):
    return [it for it in items if it[0].strip().upper() not in ("IND", "INDIA", "IN")]


# ---------------- row-aware assembly ----------------
def order_items(items):
    items = _drop_badge(items)
    items = [it for it in items if it[0].strip()]
    if not items:
        return "", 0.0, 0
    h_med = float(np.median([it[4] for it in items]))
    tol = max(4.0, 0.55 * h_med)
    items.sort(key=lambda it: it[2])
    rows = []
    for it in items:
        placed = False
        for row in rows:
            if abs(it[2] - np.mean([x[2] for x in row])) <= tol:
                row.append(it)
                placed = True
                break
        if not placed:
            rows.append([it])
    # top row = the row whose LEFT-most character sits highest (tilt-robust)
    rows.sort(key=lambda r: min((it[3], it[2]) for it in r)[1])
    parts = []
    confs = []
    for row in rows:
        row.sort(key=lambda it: it[3])
        parts.append("".join(it[0] for it in row))
        confs.extend(it[1] for it in row)
    return "".join(parts), (max(confs) if confs else 0.0), len(rows)


# ---------------- metrics ----------------
def edit_distance(a, b):
    dp = np.zeros((len(a) + 1, len(b) + 1), dtype=int)
    for i in range(len(a) + 1):
        dp[i, 0] = i
    for j in range(len(b) + 1):
        dp[0, j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            dp[i, j] = min(dp[i - 1, j] + 1, dp[i, j - 1] + 1,
                           dp[i - 1, j - 1] + (a[i - 1] != b[j - 1]))
    return int(dp[-1, -1])


def cer(raw, gt):
    if not gt:
        return 0.0 if not raw else 1.0
    return edit_distance(raw, gt) / len(gt)


def apply_rules(flat):
    flat = "".join(ch for ch in flat.upper() if ch.isalnum())
    if not flat:
        return "", ""
    cands = [flat]
    if len(flat) >= 2 and flat[0] == "0" and flat[1].isalpha():
        cands.append("O" + flat[1:])
    best = None
    for cand in cands:
        r = india_rules.correct_plate(cand)
        if r is None:
            continue
        if best is None or r["score"] > best["score"]:
            best = r
    if best is None:
        return flat, ""
    return best["plate"], best.get("label", "")


# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="process only first N images (0 = all)")
    ap.add_argument("--names", nargs="*", default=None, help="only these file names")
    args = ap.parse_args()

    files = sorted(p for p in INPUT_DIR.iterdir() if p.suffix.lower() in (".jpg", ".png", ".jpeg"))
    if args.names:
        files = [p for p in files if p.name in args.names]
    if args.limit:
        files = files[: args.limit]
    print(f"images: {len(files)}", flush=True)

    init_ocr()
    print("OCR engines loaded", flush=True)

    rows = []
    stats = {"paddle": 0, "easy": 0, "none": 0, "exact": 0, "exact_raw": 0}
    cer_sum = 0.0
    multi = {"n": 0, "exact": 0, "cer": 0.0}
    single = {"n": 0, "exact": 0, "cer": 0.0}

    for i, p in enumerate(files, 1):
        img = cv2.imread(str(p), cv2.IMREAD_COLOR)
        gt = gt_from_stem(p.stem)
        if img is None:
            rows.append([p.name, gt, "READ_FAIL", "", "", "", "", "0", "", "0"])
            continue
        if img.shape[1] < 400:
            img = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)

        pad_raw, pad_conf, pad_rows = "", 0.0, 0
        easy_raw, easy_conf, easy_rows = "", 0.0, 0
        engine = "none"

        try:
            crops = split_lines(img)
            if len(crops) > 1:
                parts, confs = [], []
                for crop in crops:
                    t, c, _ = order_items(_paddle_items(crop))
                    if t:
                        parts.append(t)
                        confs.append(c)
                if parts and max(confs) >= PADDLE_CONF_FALLBACK:
                    pad_raw = "".join(parts)
                    pad_conf = max(confs)
                    pad_rows = len(parts)
                    engine = "paddle"
                else:
                    eparts, econfs = [], []
                    for crop in crops:
                        t, c, _ = order_items(_easy_items(crop))
                        if t:
                            eparts.append(t)
                            econfs.append(c)
                    if eparts:
                        easy_raw = "".join(eparts)
                        easy_conf = max(econfs)
                        easy_rows = len(eparts)
                        engine = "easy"
            else:
                pad_raw, pad_conf, pad_rows = order_items(_paddle_items(img))
                if pad_raw and pad_conf >= PADDLE_CONF_FALLBACK:
                    engine = "paddle"
                else:
                    easy_raw, easy_conf, easy_rows = order_items(_easy_items(img))
                    if easy_raw:
                        engine = "easy"
        except Exception as exc:
            print(f"  ERROR {p.name}: {exc}", flush=True)

        raw = pad_raw if engine == "paddle" else easy_raw
        corrected, label = apply_rules(raw)

        exact = int(corrected == gt)
        exact_raw = int(raw.replace(" ", "") == gt)
        c = cer(corrected, gt)
        cer_sum += c
        rows_found = pad_rows if engine == "paddle" else easy_rows
        multi_flag = 2 if rows_found > 1 else 1

        stats[engine] += 1
        stats["exact"] += exact
        stats["exact_raw"] += exact_raw
        bucket = multi if multi_flag == 2 else single
        bucket["n"] += 1
        bucket["exact"] += exact
        bucket["cer"] += c

        rows.append([p.name, gt, engine, pad_raw, f"{pad_conf:.2f}", easy_raw,
                     f"{easy_conf:.2f}", corrected, str(exact), label, f"{c:.3f}"])
        if i % 25 == 0:
            print(f"  {i}/{len(files)}", flush=True)

    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file", "ground_truth", "engine", "paddle_raw", "paddle_conf",
                    "easy_raw", "easy_conf", "corrected", "exact", "label", "cer"])
        w.writerows(rows)

    n = max(1, len(rows))
    print("=== SUMMARY ===")
    print(f"files: {n}")
    print(f"engine: paddle={stats['paddle']} easy={stats['easy']} none={stats['none']}")
    print(f"exact (raw OCR)      : {stats['exact_raw']}/{n} = {100*stats['exact_raw']/n:.1f}%")
    print(f"exact (after rules)  : {stats['exact']}/{n} = {100*stats['exact']/n:.1f}%")
    print(f"avg CER (corrected)  : {cer_sum/n:.3f}")
    if multi["n"]:
        print(f"2-row: n={multi['n']} exact={100*multi['exact']/multi['n']:.1f}% CER={multi['cer']/multi['n']:.3f}")
    if single["n"]:
        print(f"1-row: n={single['n']} exact={100*single['exact']/single['n']:.1f}% CER={single['cer']/single['n']:.3f}")
    print(f"report: {CSV_OUT}")


if __name__ == "__main__":
    sys.exit(main())
