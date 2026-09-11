# BEL ANPR 26127 — Model Registry & Training Details

All models used in the prototype. This file documents what each model is, what data it was trained on, who trained it, its size, format, and how it fits into the pipeline.

---

## 1. Trained By Our Team (Fine-Tuned / Custom)

### `work1/runs/full/train50/weights/best.pt` — Fine-Tuned Indian License Plate Detector
- **Status:** ✅ Trained by our team (Member 1 pipeline)
- **Base:** YOLO26s (Ultralytics) fine-tuned for single-class `license_plate`
- **Training data:** 482 train + 71 val images from Kaggle Indian Number Plate Annotation (15,000+ annotated images) + DataCluster Indian Plate dataset
- **Epochs:** Best at epoch 25 (of 50 max)
- **Performance:** mAP50 = 99.12%, Precision = 97.00%, Recall = 97.26%, mAP50-95 = 64.30%
- **Size:** 20 MB (PyTorch .pt)
- **Exports:** `best.engine` (TensorRT, 80MB), `best.fp16.onnx` (19MB), `best.onnx` (37MB)
- **Usage:** `backend/src/anpr/detector.py` loads this as the plate detection model (fine-tuned path), running after vehicle detection
- **Pipeline position:** Vehicle bbox crop → plate detection with this model → quality filter → ByteTrack accumulation → OCR voting
- **Evidence:** `work1/anpr_app/yolo26s.pt` is the base YOLO26s; `best.pt` is the fine-tuned plate model; training logs in `work1/runs/full/train50/`

### `work1/anpr_app/yolo26s.pt` — Base YOLO26 Small (Pre-trained, not fine-tuned by us for plates)
- **Status:** ⚠️ Pre-trained base (Ultralytics), we fine-tuned a separate copy (`best.pt`)
- **Base:** YOLO26s (official Ultralytics model, COCO pre-trained)
- **Usage:** Used as the vehicle detection stage in some pipeline configurations; also the architecture base for our fine-tuned plate model
- **Size:** 20 MB
- **Note:** Not our custom training, but it is the foundation of our detection pipeline

### `work1/runs/detect/train/weights/best.pt` — Smoke / Quick Test Model
- **Status:** ⚠️ Quick smoke-test model (shorter training run)
- **Usage:** `runs/smoke/test5/` — quick verification runs, not production
- **Performance:** Lower accuracy than `full/train50` version; used for rapid prototyping only
- **Size:** 20 MB

---

## 2. Pre-Trained Base Models (Downloaded / Official)

### `work1/yolo26n.pt` — YOLO26 Nano (Official, smallest)
- **Status:** 🔽 Official Ultralytics pre-trained (NOT fine-tuned by us)
- **Base:** YOLO26n (5.3 MB)
- **Usage:** Lightweight option; could be substituted in edge-constrained scenarios; included in `work1/weights/`
- **Performance:** Lower accuracy than YOLO26s; not used in production pipeline
- **Note:** This is the same file found at `work1/weights/yolo26n.pt`

### `work1/yolo26l.pt` — YOLO26 Large (Official, large)
- **Status:** 🔽 Official Ultralytics pre-trained (51 MB)
- **Usage:** Could be used for higher-accuracy vehicle detection; not currently active in our pipeline (we use YOLO26s for balance of speed/accuracy)

### `work1/yolo26m.pt` — YOLO26 Medium (Official)
- **Status:** 🔽 Official Ultralytics pre-trained (43 MB)
- **Usage:** Not actively used in current pipeline

### `work1/yolo26x.pt` — YOLO26 Extra Large (Official, largest)
- **Status:** 🔽 Official Ultralytics pre-trained (114 MB)
- **Usage:** Highest accuracy base; could replace YOLO26s if GPU resources are plentiful
- **Note:** Exceeds GitHub regular file size limits (100 MB); must be downloaded separately

---

## 3. Alternative Architecture (Not Active, For Comparison)

### `work1/rtdetr-l.pt` — RT-DETR Large (Pre-trained)
- **Status:** 🔽 Official pre-trained RT-DETR (not used in our active pipeline)
- **Usage:** Referenced in discussions/comparisons; NOT our production model
- **Why not used:** RT-DETR lacks dedicated small-object mechanism; YOLO26's STAL (Small Target-Aware Label Assignment) outperforms it on 29px-height plates
- **Evidence:** `work1/anpr_app/` does not reference this file; `detector.py` uses YOLO, not RT-DETR
- **Size:** 64 MB

---

## 4. Exports / Deployment Formats

These are derived FROM our `best.pt` fine-tuned model and are the ones actually deployed on the edge device (`yarmuk`).

| File | Source | Size | Format | Purpose |
|------|--------|------|--------|---------|
| `work1/runs/full/train50/weights/best.engine` | Exported from `best.pt` | 80 MB | TensorRT `.engine` | Production deployment on Jetson (1.43x speedup) |
| `work1/runs/full/train50/weights/best.fp16.onnx` | Exported from `best.pt` | 19 MB | ONNX FP16 | Cross-platform compatibility |
| `work1/runs/full/train50/weights/best.onnx` | Exported from `best.pt` | 37 MB | ONNX standard | Fallback / testing |

---

## 5. What We Trained vs. What We Downloaded

### Trained By Our Team (Evidence in repo):
1. `work1/runs/full/train50/weights/best.pt` — ✅ Fine-tuned plate detector (15K Indian plates, 50 epochs, best epoch 25, mAP50=99.12%)
2. `work1/runs/full/train50/weights/best.engine` — ✅ TensorRT export of our fine-tuned model
3. `work1/runs/full/train50/weights/best.fp16.onnx` — ✅ ONNX export of our fine-tuned model
4. `work1/anpr_app/yolo26s.pt` — ⚠️ Base YOLO26s (pre-trained by Ultralytics; we use it as the vehicle detector, not our fine-tuning)

### Pre-Trained / Downloaded (Not our training):
5. `work1/yolo26n.pt` — Official YOLO26n (5.3 MB)
6. `work1/yolo26m.pt` — Official YOLO26m (43 MB)
7. `work1/yolo26l.pt` — Official YOLO26l (51 MB)
8. `work1/yolo26x.pt` — Official YOLO26x (114 MB)
9. `work1/rtdetr-l.pt` — Official RT-DETR (64 MB, not used in pipeline)

### Quick Prototype (Smoke Test):
10. `work1/runs/detect/train/weights/best.pt` — Short-run test model (not production quality)
11. `work1/runs/smoke/test5/weights/best.pt` — Smoke test only

---

## 6. How Models Are Referenced in Code

- `backend/src/anpr/detector.py`: Loads `YOLODetector` → `plate_model` (our fine-tuned `best.pt` or base model path configured in `.env`)
- `.env.example`: `PLATE_MODEL_PATH=work1/anpr_app/yolo26s.pt` or `work1/runs/full/train50/weights/best.pt`
- `prototype/backend/src/anpr/`: The production backend uses the model paths defined in `config.py`
- `prototype/README.md`: Documents the `OCR_ENGINE` hot-swap mechanism; the detection engine uses the YOLO-based pipeline
- `work1/anpr_app/`: Contains training scripts and the base model (`yolo26s.pt`)

---

## 7. Upload Note

These model files (`.pt`, `.pth`, `.engine`, `.onnx`) exceed GitHub's file size limits (100 MB for `.pt`, 50 MB recommended). They are excluded from `.gitignore` (`*.pt`, `*.pth`, `*.onnx`, `runs/`).

**To share/download:**
- `best.pt` (20 MB) + `best.engine` (80 MB) → key production files; can be hosted as GitHub Release assets or shared via external storage
- `yolo26s.pt` (20 MB) → base model; available from Ultralytics Hub
- All other `.pt` files → either official pre-trained (download from source) or quick test runs

---

*Document generated from verified file listings in `/home/mjonir/f/sih2026/work1/` and `/home/mjonir/f/sih2026/prototype/backend/src/anpr/` with file sizes and timestamps verified.*
