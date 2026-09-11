-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CAMERAS: Physical camera locations
-- =============================================
CREATE TABLE cameras (
    camera_id   TEXT PRIMARY KEY,
    label       TEXT,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    geom        GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cameras_geom ON cameras USING GIST (geom);

-- =============================================
-- DETECTIONS: Core event table (one row per plate read)
-- =============================================
CREATE TABLE detections (
    id                BIGSERIAL PRIMARY KEY,
    camera_id         TEXT NOT NULL REFERENCES cameras(camera_id) ON DELETE CASCADE,
    plate_raw         TEXT NOT NULL,
    plate_normalized  TEXT NOT NULL,
    confidence        REAL NOT NULL DEFAULT 0.0,
    vehicle_type      TEXT NOT NULL DEFAULT 'unknown',
    image_ref         TEXT,
    detected_at       TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for query performance
CREATE INDEX idx_det_plate ON detections (plate_normalized);
CREATE INDEX idx_det_camera ON detections (camera_id);
CREATE INDEX idx_det_time ON detections (detected_at DESC);
CREATE INDEX idx_det_cam_time ON detections (camera_id, detected_at DESC);
CREATE INDEX idx_det_plate_trgm ON detections USING GIN (plate_normalized gin_trgm_ops);
CREATE INDEX idx_det_confidence ON detections (confidence DESC);

-- Partition by month for high-volume ingest (optional, enable for production)
-- CREATE TABLE detections_y2026m09 PARTITION OF detections
-- FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- =============================================
-- BLACKLIST: Plates to flag
-- =============================================
CREATE TABLE blacklist (
    id                BIGSERIAL PRIMARY KEY,
    plate_normalized  TEXT NOT NULL UNIQUE,
    reason            TEXT NOT NULL,
    added_by          TEXT,
    active            BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bl_plate ON blacklist (plate_normalized);
CREATE INDEX idx_bl_active ON blacklist (active) WHERE active = true;

-- =============================================
-- ALERTS: Log of every alert raised
-- =============================================
CREATE TABLE alerts (
    id                BIGSERIAL PRIMARY KEY,
    alert_type        TEXT NOT NULL,
    plate_normalized  TEXT NOT NULL,
    detection_id      BIGINT REFERENCES detections(id) ON DELETE SET NULL,
    details           JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_plate ON alerts (plate_normalized);
CREATE INDEX idx_alerts_type ON alerts (alert_type);
CREATE INDEX idx_alerts_time ON alerts (created_at DESC);
CREATE INDEX idx_alerts_detection ON alerts (detection_id);

-- =============================================
-- VIEWS for common queries
-- =============================================

-- Latest detection per plate
CREATE OR REPLACE VIEW latest_detections AS
SELECT DISTINCT ON (plate_normalized)
    id, camera_id, plate_raw, plate_normalized, confidence,
    vehicle_type, image_ref, detected_at
FROM detections
ORDER BY plate_normalized, detected_at DESC;

-- Camera statistics
CREATE OR REPLACE VIEW camera_stats AS
SELECT
    c.camera_id,
    c.label,
    c.latitude,
    c.longitude,
    COUNT(d.id) AS total_detections,
    COUNT(DISTINCT d.plate_normalized) AS unique_plates,
    MAX(d.detected_at) AS last_detection
FROM cameras c
LEFT JOIN detections d ON d.camera_id = c.camera_id
GROUP BY c.camera_id, c.label, c.latitude, c.longitude;

-- =============================================
-- FUNCTION: Insert detection with alert checking
-- =============================================
CREATE OR REPLACE FUNCTION insert_detection(
    p_camera_id TEXT,
    p_plate_raw TEXT,
    p_plate_normalized TEXT,
    p_confidence REAL,
    p_vehicle_type TEXT,
    p_image_ref TEXT,
    p_detected_at TIMESTAMPTZ
) RETURNS detections AS $$
DECLARE
    v_detection detections%ROWTYPE;
BEGIN
    INSERT INTO detections (
        camera_id, plate_raw, plate_normalized, confidence,
        vehicle_type, image_ref, detected_at
    ) VALUES (
        p_camera_id, p_plate_raw, p_plate_normalized, p_confidence,
        p_vehicle_type, p_image_ref, p_detected_at
    ) RETURNING * INTO v_detection;

    RETURN v_detection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
