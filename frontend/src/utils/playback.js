/**
 * Playback engine utilities for smooth vehicle animation
 * Handles polyline interpolation, time mapping, and bearing calculation
 */

import { haversineDistance, calculateBearing } from './osrm.js'

/**
 * Build route index mapping trajectory points to fractional positions along polyline.
 * Uses Leaflet GeometryUtils-style nearest point projection.
 * 
 * @param {Array} routeCoords - Array of [lat, lng] from OSRM route geometry
 * @param {Array} detectionPoints - Array of { lat, lng, time } from detections
 * @returns {Array} Array of { time, fraction, lat, lng }
 */
export function buildRouteIndex(routeCoords, detectionPoints) {
  if (!routeCoords.length || !detectionPoints.length) return []

  // Convert route to {lat,lng} objects (accepts [lat,lng] pairs OR {lat,lng})
  const route = routeCoords.map((pt) =>
    Array.isArray(pt) ? { lat: pt[0], lng: pt[1] } : { lat: pt.lat, lng: pt.lng }
  )

  // For each detection, find nearest point on route polyline
  const index = []

  for (const point of detectionPoints) {
    const fraction = nearestFractionOnPolyline(route, point.lat, point.lng)
    index.push({
      time: point.time,
      fraction: Math.max(0, Math.min(1, fraction)),
      lat: point.lat,
      lng: point.lng,
    })
  }

  // Sort by fraction to ensure monotonic progression
  index.sort((a, b) => a.fraction - b.fraction)

  return index
}

/**
 * Find the fractional position (0-1) along a polyline closest to a given point.
 * Uses perpendicular projection onto line segments.
 * 
 * @param {Array} polyline - Array of { lat, lng } points
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @returns {number} Fraction along polyline (0-1)
 */
export function nearestFractionOnPolyline(polyline, lat, lng) {
  if (polyline.length < 2) return 0

  let minDist = Infinity
  let bestFraction = 0
  let accumulatedDist = 0
  let totalDist = 0

  // First pass: calculate total polyline distance
  for (let i = 1; i < polyline.length; i++) {
    totalDist += haversineDistance(
      polyline[i - 1].lat,
      polyline[i - 1].lng,
      polyline[i].lat,
      polyline[i].lng
    )
  }

  // Second pass: find closest point on each segment
  for (let i = 1; i < polyline.length; i++) {
    const p1 = polyline[i - 1]
    const p2 = polyline[i]
    const segmentDist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng)

    if (segmentDist === 0) continue

    // Project point onto line segment
    const projection = projectPointToSegment(lat, lng, p1, p2)
    const dist = haversineDistance(lat, lng, projection.lat, projection.lng)

    if (dist < minDist) {
      minDist = dist
      const segmentFraction = projection.fraction
      bestFraction = (accumulatedDist + segmentDist * segmentFraction) / totalDist
    }

    accumulatedDist += segmentDist
  }

  return Math.max(0, Math.min(1, bestFraction))
}

/**
 * Project a point onto a line segment (spherical approximation).
 * Returns the projected point and fraction along segment.
 * 
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {Object} p1 - Segment start { lat, lng }
 * @param {Object} p2 - Segment end { lat, lng }
 * @returns {Object} { lat, lng, fraction }
 */
function projectPointToSegment(lat, lng, p1, p2) {
  // Convert to local Cartesian for projection (flat earth approximation for short segments)
  const R = 6371000 // Earth radius in meters
  
  const lat1 = p1.lat * Math.PI / 180
  const lng1 = p1.lng * Math.PI / 180
  const lat2 = p2.lat * Math.PI / 180
  const lng2 = p2.lng * Math.PI / 180
  const latP = lat * Math.PI / 180
  const lngP = lng * Math.PI / 180

  // Local coordinate system centered at p1
  const x1 = 0
  const y1 = 0
  const x2 = R * (lng2 - lng1) * Math.cos(lat1)
  const y2 = R * (lat2 - lat1)
  const xP = R * (lngP - lng1) * Math.cos(lat1)
  const yP = R * (latP - lat1)

  // Project onto line
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy

  let fraction = 0
  if (len2 > 0) {
    fraction = Math.max(0, Math.min(1, ((xP - x1) * dx + (yP - y1) * dy) / len2))
  }

  // Interpolate back to lat/lng
  const projLat = p1.lat + (p2.lat - p1.lat) * fraction
  const projLng = p1.lng + (p2.lng - p1.lng) * fraction

  return { lat: projLat, lng: projLng, fraction }
}

/**
 * Get interpolated position along route at given time.
 * 
 * @param {Array} routeIndex - Output from buildRouteIndex
 * @param {number} targetTime - Target timestamp in ms
 * @returns {Object|null} { lat, lng, bearing, fraction, progress }
 */
export function getPositionAtTime(routeIndex, targetTime) {
  if (!routeIndex.length) return null

  // Find bracketing index entries
  let beforeIdx = 0
  let afterIdx = routeIndex.length - 1

  for (let i = 0; i < routeIndex.length - 1; i++) {
    if (targetTime >= routeIndex[i].time && targetTime <= routeIndex[i + 1].time) {
      beforeIdx = i
      afterIdx = i + 1
      break
    }
  }

  const before = routeIndex[beforeIdx]
  const after = routeIndex[afterIdx]

  if (before.time === after.time) {
    return {
      lat: before.lat,
      lng: before.lng,
      bearing: 0,
      fraction: before.fraction,
      progress: 0,
    }
  }

  // Interpolate fraction
  const timeProgress = (targetTime - before.time) / (after.time - before.time)
  const fraction = before.fraction + (after.fraction - before.fraction) * timeProgress

  // Interpolate position
  const lat = before.lat + (after.lat - before.lat) * timeProgress
  const lng = before.lng + (after.lng - before.lng) * timeProgress
  const bearing = calculateBearing(before.lat, before.lng, after.lat, after.lng)

  return {
    lat,
    lng,
    bearing,
    fraction,
    progress: timeProgress,
  }
}

/**
 * Calculate vehicle bearing from position history.
 * 
 * @param {Array} positions - Recent positions [{ lat, lng }]
 * @returns {number} Bearing in degrees
 */
export function calculateVehicleBearing(positions) {
  if (positions.length < 2) return 0
  const p1 = positions[positions.length - 2]
  const p2 = positions[positions.length - 1]
  return calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng)
}

/**
 * Animation frame timing helper.
 * 
 * @param {Function} callback - Function to call each frame
 * @returns {Object} { start, stop }
 */
export function createAnimationLoop(callback) {
  let frameId = null
  let lastTime = 0
  let running = false

  function tick(now) {
    if (!running) return
    const delta = now - lastTime
    lastTime = now
    callback(delta)
    frameId = requestAnimationFrame(tick)
  }

  return {
    start: () => {
      if (running) return
      running = true
      lastTime = performance.now()
      frameId = requestAnimationFrame(tick)
    },
    stop: () => {
      running = false
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    },
  }
}

/**
 * Time scaling utility for playback speed.
 * 
 * @param {number} delta - Raw time delta in ms
 * @param {number} speed - Playback speed multiplier
 * @returns {number} Scaled time delta
 */
export function scaleTimeDelta(delta, speed) {
  return delta * speed
}

/**
 * Format playback time for display.
 * 
 * @param {number} currentTime - Current playback time in ms
 * @param {number} totalTime - Total trajectory time in ms
 * @returns {string} Formatted "current / total"
 */
export function formatPlaybackTime(currentTime, totalTime) {
  return `${formatTime(currentTime)} / ${formatTime(totalTime)}`
}

/**
 * Format time for display.
 * 
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string} Formatted time string
 */
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}