-- Seed data for 8 Delhi cameras with realistic trajectories
-- Camera locations based on major Delhi junctions

INSERT INTO cameras (camera_id, label, latitude, longitude) VALUES
('CAM_001', 'Connaught Place Inner Circle', 28.6315, 77.2167),
('CAM_002', 'India Gate Roundabout', 28.6129, 77.2295),
('CAM_003', 'ITO Intersection', 28.6282, 77.2410),
('CAM_004', 'AIIMS Flyover', 28.5672, 77.2100),
('CAM_005', 'Dhaula Kuan Junction', 28.5921, 77.1734),
('CAM_006', 'Kashmiri Gate Metro', 28.6658, 77.2301),
('CAM_007', 'Lajpat Nagar Central Market', 28.5678, 77.2432),
('CAM_008', 'Karol Bagh Ajmal Khan Road', 28.6519, 77.1909)
ON CONFLICT (camera_id) DO UPDATE SET
    label = EXCLUDED.label,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- Sample trajectories for 5 vehicles across multiple cameras
-- Vehicle 1: DL01AB1234 - Connaught Place -> India Gate -> ITO
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_001', 'DL01AB1234', 'DL01AB1234', 0.96, 'car', '2026-09-08 08:15:22+05:30'),
('CAM_002', 'DL01AB1234', 'DL01AB1234', 0.94, 'car', '2026-09-08 08:22:10+05:30'),
('CAM_003', 'DL01AB1234', 'DL01AB1234', 0.91, 'car', '2026-09-08 08:35:45+05:30');

-- Vehicle 2: MH12CD5678 - ITO -> Kashmiri Gate -> Karol Bagh
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_003', 'MH12CD5678', 'MH12CD5678', 0.89, 'truck', '2026-09-08 09:10:05+05:30'),
('CAM_006', 'MH12CD5678', 'MH12CD5678', 0.93, 'truck', '2026-09-08 09:25:30+05:30'),
('CAM_008', 'MH12CD5678', 'MH12CD5678', 0.87, 'truck', '2026-09-08 09:42:15+05:30');

-- Vehicle 3: KA03EF9012 - AIIMS -> Dhaula Kuan -> Lajpat Nagar
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_004', 'KA03EF9012', 'KA03EF9012', 0.92, 'bike', '2026-09-08 10:05:12+05:30'),
('CAM_005', 'KA03EF9012', 'KA03EF9012', 0.88, 'bike', '2026-09-08 10:15:40+05:30'),
('CAM_007', 'KA03EF9012', 'KA03EF9012', 0.90, 'bike', '2026-09-08 10:28:22+05:30');

-- Vehicle 4: UP14GH3456 - Karol Bagh -> Connaught Place (return trip)
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_008', 'UP14GH3456', 'UP14GH3456', 0.95, 'car', '2026-09-08 11:00:00+05:30'),
('CAM_001', 'UP14GH3456', 'UP14GH3456', 0.93, 'car', '2026-09-08 11:18:30+05:30'),
('CAM_002', 'UP14GH3456', 'UP14GH3456', 0.89, 'car', '2026-09-08 11:25:10+05:30');

-- Vehicle 5: TN07IJ7890 - Lajpat Nagar -> AIIMS (local loop)
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_007', 'TN07IJ7890', 'TN07IJ7890', 0.86, 'car', '2026-09-08 12:10:00+05:30'),
('CAM_004', 'TN07IJ7890', 'TN07IJ7890', 0.91, 'car', '2026-09-08 12:22:30+05:30'),
('CAM_007', 'TN07IJ7890', 'TN07IJ7890', 0.88, 'car', '2026-09-08 12:35:00+05:30');


-- Vehicle 6: NGS1351 - Real Delhi Highway CCTV Trajectory
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_001', 'NGS1351', 'NGS1351', 0.89, 'truck', '2026-09-08 16:15:20+05:30'),
('CAM_003', 'NGS1351', 'NGS1351', 0.89, 'truck', '2026-09-08 16:32:45+05:30'),
('CAM_006', 'NGS1351', 'NGS1351', 0.71, 'truck', '2026-09-08 16:48:10+05:30');

-- Vehicle 7: GJ08AR4297 - Verified HSRP Indian Plate
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_005', 'GJ08AR4297', 'GJ08AR4297', 0.94, 'car', '2026-09-08 17:10:00+05:30'),
('CAM_004', 'GJ08AR4297', 'GJ08AR4297', 0.91, 'car', '2026-09-08 17:22:15+05:30'),
('CAM_007', 'GJ08AR4297', 'GJ08AR4297', 0.88, 'car', '2026-09-08 17:35:40+05:30');
-- Fuzzy test cases (OCR noise variants for same vehicles)
-- DL01AB1234 variants
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_001', 'DL01AB1234', 'DL01AB1234', 0.72, 'car', '2026-09-08 13:00:00+05:30'),
('CAM_002', 'DL0IAB1234', 'DL01AB1234', 0.68, 'car', '2026-09-08 13:05:00+05:30'),
('CAM_003', 'DL01AB123I', 'DL01AB1231', 0.65, 'car', '2026-09-08 13:10:00+05:30');

-- MH12CD5678 variants
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_003', 'MH12CD5678', 'MH12CD5678', 0.75, 'truck', '2026-09-08 14:00:00+05:30'),
('CAM_006', 'MH12CD5G78', 'MH12CD5678', 0.70, 'truck', '2026-09-08 14:06:00+05:30');

-- Blacklist entry for testing alerts
INSERT INTO blacklist (plate_normalized, reason, added_by) VALUES
('DL01AB1234', 'Stolen vehicle - FIR 142/2026', 'Delhi Police')
ON CONFLICT (plate_normalized) DO UPDATE SET
    reason = EXCLUDED.reason,
    active = true;

-- Test impossible travel: same plate at CAM_001 and CAM_005 within 2 minutes (impossible ~15km in 2 min = 450 km/h)
INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, detected_at) VALUES
('CAM_001', 'HR26DK8337', 'HR26DK8337', 0.94, 'car', '2026-09-08 15:00:00+05:30'),
('CAM_005', 'HR26DK8337', 'HR26DK8337', 0.91, 'car', '2026-09-08 15:02:00+05:30');

-- Seed realistic alerts for Threat Monitor testing
INSERT INTO alerts (alert_type, plate_normalized, details, created_at) VALUES
('BLACKLIST_MATCH', 'DL01AB1234', '{"reason": "Stolen vehicle - FIR 142/2026", "camera_id": "CAM_001", "location": "Connaught Place Inner Circle", "severity": "CRITICAL"}', now() - INTERVAL '15 minutes'),
('IMPOSSIBLE_TRAVEL', 'HR26DK8337', '{"reason": "Velocity violation: 450 km/h between CAM_001 and CAM_005", "speed_kmh": 450, "origin_camera": "CAM_001", "destination_camera": "CAM_005", "severity": "HIGH"}', now() - INTERVAL '35 minutes'),
('BLACKLIST_MATCH', 'UP84AE9889', '{"reason": "Flagged in NCB Watchlist - Narcotics intelligence", "camera_id": "CAM_002", "location": "India Gate Roundabout", "severity": "CRITICAL"}', now() - INTERVAL '2 hours'),
('GEOFENCE_ENTER', 'MH12CD5678', '{"reason": "Heavy commercial vehicle entered restricted NDMC zone during peak hours", "camera_id": "CAM_003", "severity": "MEDIUM"}', now() - INTERVAL '3 hours'),
('GEOFENCE_EXIT', 'TN07IJ7890', '{"reason": "Surveillance target exited South Delhi perimeter", "camera_id": "CAM_007", "severity": "LOW"}', now() - INTERVAL '4 hours');