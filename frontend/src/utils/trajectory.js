/**
 * Trajectory utilities for GeoJSON parsing and coordinate math
 */

import { haversineDistance, calculateBearing } from './osrm.js'

/**
 * Parse GeoJSON FeatureCollection into flat array of points.
 * 
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Array} Array of { lat, lng, time, properties } objects
 */
export function parseTrajectoryGeoJSON(geojson) {
  if (!geojson || geojson.type !== 'FeatureCollection') return []

  return geojson.features
    .filter(f => f.geometry?.type === 'Point')
    .map(f => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      time: f.properties?.detected_at ? new Date(f.properties.detected_at).getTime() : null,
      properties: f.properties,
    }))
    .filter(p => p.time !== null)
    .sort((a, b) => a.time - b.time)
}

/**
 * Convert trajectory points to OSRM format.
 * 
 * @param {Array} points - Array of { lat, lng, time, properties }
 * @returns {Array} Array of { lon, lat, t } for OSRM
 */
export function pointsToOSRM(points) {
  return points.map(p => ({
    lon: p.lng,
    lat: p.lat,
    t: Math.floor(p.time / 1000),
  }))
}

/**
 * Calculate total distance of a trajectory using Haversine formula.
 * 
 * @param {Array} points - Array of { lat, lng }
 * @returns {number} Total distance in kilometers
 */
export function calculateTrajectoryDistance(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
  }
  return total
}

/**
 * Calculate bounding box of trajectory points.
 * 
 * @param {Array} points - Array of { lat, lng }
 * @returns {Object} { minLat, maxLat, minLng, maxLng }
 */
export function calculateBounds(points) {
  if (points.length === 0) return null

  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng

  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }

  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Get center point of trajectory.
 * 
 * @param {Array} points - Array of { lat, lng }
 * @returns {Object} { lat, lng }
 */
export function getTrajectoryCenter(points) {
  const bounds = calculateBounds(points)
  if (!bounds) return { lat: 0, lng: 0 }
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  }
}

/**
 * Find nearest point on trajectory to a given coordinate.
 * 
 * @param {Array} points - Array of { lat, lng, time }
 * @param {number} lat - Target latitude
 * @param {number} lng - Target longitude
 * @returns {Object} { index, point, distance }
 */
export function findNearestPoint(points, lat, lng) {
  let minDist = Infinity
  let nearestIndex = -1
  let nearestPoint = null

  points.forEach((p, i) => {
    const dist = haversineDistance(lat, lng, p.lat, p.lng)
    if (dist < minDist) {
      minDist = dist
      nearestIndex = i
      nearestPoint = p
    }
  })

  return { index: nearestIndex, point: nearestPoint, distance: minDist }
}

/**
 * Interpolate position along trajectory at a given time.
 * 
 * @param {Array} points - Array of { lat, lng, time } sorted by time
 * @param {number} targetTime - Target timestamp in ms
 * @returns {Object|null} { lat, lng, bearing, progress }
 */
export function interpolatePosition(points, targetTime) {
  if (points.length < 2) return null

  // Find bracketing points
  let beforeIdx = 0
  let afterIdx = points.length - 1

  for (let i = 0; i < points.length - 1; i++) {
    if (targetTime >= points[i].time && targetTime <= points[i + 1].time) {
      beforeIdx = i
      afterIdx = i + 1
      break
    }
  }

  const p1 = points[beforeIdx]
  const p2 = points[afterIdx]
  const t1 = p1.time
  const t2 = p2.time

  if (t2 === t1) return { lat: p1.lat, lng: p1.lng, bearing: 0, progress: 0 }

  const progress = (targetTime - t1) / (t2 - t1)
  const lat = p1.lat + (p2.lat - p1.lat) * progress
  const lng = p1.lng + (p2.lng - p1.lng) * progress
  const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng)

  return { lat, lng, bearing, progress }
}

/**
 * Format timestamp for display.
 * 
 * @param {number} timestamp - Unix timestamp in ms
 * @returns {string} Formatted time string
 */
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString()
}

/**
 * Format duration in milliseconds to HH:MM:SS.
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Calculate speed between two points.
 * 
 * @param {Object} p1 - { lat, lng, time }
 * @param {Object} p2 - { lat, lng, time }
 * @returns {number} Speed in km/h
 */
export function calculateSpeed(p1, p2) {
  const distance = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng)
  const hours = Math.abs(p2.time - p1.time) / 3600000
  return hours > 0 ? distance / hours : 0
}