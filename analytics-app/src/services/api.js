/**
 * Backend API Client & Service Layer
 * Connects to REST endpoints when live, with instant 0ms client-side temporal engine for ultra-fast scrubbing & playback (1x, 2x, 3x, 4x)
 */

import { LOCATIONS, TIME_SLICES, generateLightContinuousHeatPoints, generateDelhiVehicleDetections } from './trafficData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Track whether backend is reachable to avoid blocking animation loops with network timeouts
let isBackendLive = false;
let hasCheckedBackend = false;

function buildLocalTemporalData(locationKey, radiusKm, timeIndex) {
  const loc = LOCATIONS[locationKey] || LOCATIONS.all_delhi;
  const slice = TIME_SLICES[timeIndex] || TIME_SLICES[0];
  const intensityMultiplier = slice.totalVehicles / 24000;
  const continuousHeat = generateLightContinuousHeatPoints(loc.coords[0], loc.coords[1], radiusKm, intensityMultiplier);
  const vehicleDetections = generateDelhiVehicleDetections(intensityMultiplier);

  return {
    status: "success",
    query: {
      location: loc,
      radius_km: radiusKm,
      time: slice.timeLabel,
      timestamp: slice.timestamp
    },
    summary: {
      total_vehicles: slice.totalVehicles,
      avg_speed_kmh: slice.avgSpeedKmh,
      congestion_index_pct: slice.congestionIndexPct,
      active_cameras: slice.activeCameras || 9600,
      daily_detections: slice.dailyDetectionsTotal || 342800,
      period: slice.period,
      choke_count: slice.chokeCount
    },
    continuous_heat: continuousHeat,
    vehicle_detections: vehicleDetections,
    path_spectrum: slice.pathSpectrum || [],
    camera_clusters: slice.cameraClusters || [],
    precise_cameras: slice.preciseCameras || [],
    camera_deployment_stats: {
      total_delhi_cameras: slice.delhiTotalCameras || 9600,
      turn_cameras_count: slice.delhiTurnCameras || 5840,
      linear_cameras_count: slice.delhiLinearCameras || 3760,
      turn_coverage_pct: slice.turnCoverageCompliancePct || 100,
      max_spacing_km: slice.maxSpacingKm || 0.95,
      monitored_corridor_cameras: slice.monitoredCorridorCamerasCount || 120,
      policy: "Min 1 Camera / 1 km + Mandatory Camera at Every Turn"
    },
    bottlenecks: slice.bottlenecks || [],
    corridors: slice.corridors || []
  };
}

export const TrafficApi = {
  // Fetch traffic density, heatmap points, and bottlenecks for location + radius + time slice
  async getTrafficDensity({ locationKey = 'all_delhi', radiusKm = 22.0, timeIndex = 0 }) {
    // If backend is known to be live or on first check with explicit URL
    if (isBackendLive || (!hasCheckedBackend && import.meta.env.VITE_API_URL)) {
      try {
        hasCheckedBackend = true;
        const loc = LOCATIONS[locationKey] || LOCATIONS.all_delhi;
        const slice = TIME_SLICES[timeIndex] || TIME_SLICES[0];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120);

        const url = `${BASE_URL}/analytics/traffic-density?lat=${loc.coords[0]}&lng=${loc.coords[1]}&radius_km=${radiusKm}&from_time=${slice.timestamp}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          isBackendLive = true;
          return await res.json();
        }
      } catch {
        isBackendLive = false;
      }
    }

    // Instant zero-latency generation (runs in < 1ms, preventing any dropped frames during 1x/2x/3x/4x playback)
    return buildLocalTemporalData(locationKey, radiusKm, timeIndex);
  }
};
