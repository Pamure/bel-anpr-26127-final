/**
 * OSRM API Client for frontend
 * Handles /match requests with automatic chunking and overlap
 * Mirrors backend osrm_client.py functionality
 */

const OSRM_BASE = import.meta.env.VITE_OSRM_BASE || '/api/osrm'

/**
 * Chunk coordinates array to respect OSRM's 100-coordinate limit.
 * Uses overlap to ensure smooth boundary matching (HMM needs context).
 *
 * @param {Array} coords - Array of { lon, lat, t } objects
 * @param {number} size - Chunk size (default 100 = OSRM limit)
 * @param {number} overlap - Overlap between chunks (default 9)
 * @returns {Array} Array of coordinate chunks
 */
export function chunkCoords(coords, size = 100, overlap = 9) {
  if (!coords || coords.length === 0) return []
  if (coords.length <= size) return [coords]

  const chunks = []
  const step = size - overlap
  let i = 0
  while (i < coords.length) {
    const end = Math.min(i + size, coords.length)
    chunks.push(coords.slice(i, end))
    if (end === coords.length) break
    i += step // next chunk shares `overlap` boundary points
  }
  return chunks
}

/**
 * Build the OSRM /match URL for a set of points.
 * 
 * @param {Array} points - Array of { lon, lat, t } objects
 * @returns {string} OSRM match URL
 */
export function buildMatchUrl(points) {
  const coords = points.map(p => `${p.lon},${p.lat}`).join(';')
  const timestamps = points.map(p => p.t).join(';')
  return `${OSRM_BASE}/match/v1/driving/${coords}?timestamps=${timestamps}&geometries=geojson&overview=full&tidy=true`
}

/**
 * Fetch OSRM /match for a single chunk of points.
 * 
 * @param {Array} points - Array of { lon, lat, t } objects
 * @returns {Promise<Object|null>} Match result or null on error
 */
async function matchChunk(points) {
  const url = buildMatchUrl(points)
  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
      console.warn('OSRM match failed:', data.code, data.message)
      return null
    }

    const matching = data.matchings[0]
    return {
      geometry: matching.geometry,
      distance: matching.distance,
      duration: matching.duration,
      confidence: matching.confidence,
      tracepoints: data.tracepoints,
    }
  } catch (err) {
    console.error('OSRM fetch error:', err)
    return null
  }
}

/**
 * Fetch OSRM /match for an entire trace with automatic chunking.
 * Merges chunk geometries and sums distance/duration.
 * 
 * @param {Array} points - Array of { lon, lat, t } objects
 * @returns {Promise<Object|null>} Merged match result
 */
export async function fetchMatch(points) {
  if (points.length < 2) return null

  // Single request if under limit
  if (points.length <= 100) {
    return matchChunk(points)
  }

  // Chunk and merge
  const chunks = chunkCoords(points)
  const results = []

  for (const chunk of chunks) {
    const result = await matchChunk(chunk)
    if (result) results.push(result)
  }

  if (results.length === 0) return null

  // Merge geometries - drop duplicate boundary points
  const mergedCoords = [...results[0].geometry.coordinates]
  for (let i = 1; i < results.length; i++) {
    const coords = results[i].geometry.coordinates
    mergedCoords.push(...coords.slice(1)) // skip first (overlap point)
  }

  return {
    geometry: {
      type: 'LineString',
      coordinates: mergedCoords,
    },
    distance: results.reduce((sum, r) => sum + r.distance, 0),
    duration: results.reduce((sum, r) => sum + r.duration, 0),
    confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    tracepoints: results[0].tracepoints,
  }
}

/**
 * Convert trajectory points to OSRM format.
 * 
 * @param {Array} detections - Array of detection objects with latitude, longitude, detected_at
 * @returns {Array} Array of { lon, lat, t } objects
 */
export function pointsFromDetections(detections) {
  return detections
    .filter(d => d.latitude != null && d.longitude != null)
    .map(d => ({
      lon: parseFloat(d.longitude),
      lat: parseFloat(d.latitude),
      t: Math.floor(new Date(d.detected_at).getTime() / 1000),
    }))
}

/**
 * Calculate bearing between two points.
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180

  const y = Math.sin(dLng) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
  const bearing = Math.atan2(y, x) * 180 / Math.PI

  return (bearing + 360) % 360
}

/**
 * Calculate Haversine distance between two points.
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}