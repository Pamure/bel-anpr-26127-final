import { describe, it, expect } from 'vitest'
import { chunkCoords, fetchMatch, pointsFromDetections } from '../src/utils/osrm.js'
import { parseTrajectoryGeoJSON, calculateTrajectoryDistance, interpolatePosition } from '../src/utils/trajectory.js'
import { nearestFractionOnPolyline, buildRouteIndex } from '../src/utils/playback.js'

describe('osrm utils', () => {
  it('single chunk under 100 points', () => {
    const pts = Array.from({ length: 95 }, (_, i) => ({ lon: 77.2 + i * 0.001, lat: 28.6, t: 1000 + i }))
    expect(chunkCoords(pts).length).toBe(1)
  })

  it('chunks 250 points with overlap', () => {
    const pts = Array.from({ length: 250 }, (_, i) => ({ lon: 77.2 + i * 0.001, lat: 28.6, t: 1000 + i }))
    const chunks = chunkCoords(pts)
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    expect(chunks.every(c => c.length <= 100)).toBe(true)
  })

  it('empty input yields empty chunks', () => {
    expect(chunkCoords([])).toEqual([])
  })

  it('chunk boundary overlaps by design', () => {
    const pts = Array.from({ length: 150 }, (_, i) => ({ lon: 77.2, lat: 28.6 + i * 0.001, t: i }))
    const [a, b] = chunkCoords(pts)
    const aTimes = new Set(a.map(p => p.t))
    expect(b.some(p => aTimes.has(p.t))).toBe(true)
  })

  it('pointsFromDetections converts ISO timestamps', () => {
    const out = pointsFromDetections([{ latitude: 28.6, longitude: 77.2, detected_at: '2026-09-08T08:15:22+05:30' }])
    expect(out[0].t).toBeTypeOf('number')
    expect(out[0].lat).toBeCloseTo(28.6, 5)
  })

  it('pointsFromDetections drops null coords', () => {
    const out = pointsFromDetections([
      { latitude: null, longitude: 77.2, detected_at: '2026-09-08T08:15:22+05:30' },
      { latitude: 28.7, longitude: 77.3, detected_at: '2026-09-08T08:15:22+05:30' },
    ])
    expect(out.length).toBe(1)
  })

  it('fetchMatch returns null under 2 points', async () => {
    const out = await fetchMatch([{ lon: 77.2, lat: 28.6, t: 1 }])
    expect(out).toBeNull()
  })
})

describe('trajectory utils', () => {
  const geojson = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.2167, 28.6315] }, properties: { detected_at: '2026-09-08T08:15:22+05:30' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.2295, 28.6129] }, properties: { detected_at: '2026-09-08T08:22:10+05:30' } },
    ],
  }

  it('parses GeoJSON into sorted time points', () => {
    const pts = parseTrajectoryGeoJSON(geojson)
    expect(pts.length).toBe(2)
    expect(pts[0].lat).toBeCloseTo(28.6315, 4)
    expect(pts[0].time).toBeLessThan(pts[1].time)
  })

  it('empty geojson yields empty array', () => {
    expect(parseTrajectoryGeoJSON(null)).toEqual([])
    expect(parseTrajectoryGeoJSON({ type: 'FeatureCollection', features: [] })).toEqual([])
  })

  it('total distance is positive and sane', () => {
    const pts = [
      { lat: 28.6315, lng: 77.2167, time: 0 },
      { lat: 28.6129, lng: 77.2295, time: 1 },
    ]
    const km = calculateTrajectoryDistance(pts)
    expect(km).toBeGreaterThan(1)
    expect(km).toBeLessThan(5)
  })

  it('interpolates exactly at endpoints', () => {
    const pts = [
      { lat: 28.6315, lng: 77.2167, time: 100 },
      { lat: 28.6129, lng: 77.2295, time: 200 },
    ]
    const start = interpolatePosition(pts, 100)
    expect(start.lat).toBeCloseTo(28.6315, 6)
    const end = interpolatePosition(pts, 200)
    expect(end.lat).toBeCloseTo(28.6129, 6)
  })

  it('interpolates midpoint', () => {
    const pts = [
      { lat: 0, lng: 0, time: 0 },
      { lat: 10, lng: 10, time: 100 },
    ]
    const mid = interpolatePosition(pts, 50)
    expect(mid.lat).toBeCloseTo(5, 6)
  })

  it('interpolate with single point returns null', () => {
    expect(interpolatePosition([{ lat: 1, lng: 1, time: 1 }], 1)).toBeNull()
  })

  it('interpolate empty returns null', () => {
    expect(interpolatePosition([], 1)).toBeNull()
  })
})

describe('playback utils', () => {
  it('fraction at polyline start is 0', () => {
    const poly = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]
    const f = nearestFractionOnPolyline(poly, 0, 0)
    expect(f).toBeCloseTo(0, 2)
  })

  it('fraction at polyline end is 1', () => {
    const poly = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]
    const f = nearestFractionOnPolyline(poly, 1, 1)
    expect(f).toBeCloseTo(1, 2)
  })

  it('fraction near midpoint is ~0.5', () => {
    const poly = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]
    const f = nearestFractionOnPolyline(poly, 0.5, 0.5)
    expect(f).toBeGreaterThan(0.4)
    expect(f).toBeLessThan(0.6)
  })

  it('short polyline guarded', () => {
    expect(nearestFractionOnPolyline([{ lat: 0, lng: 0 }], 1, 1)).toBe(0)
  })

  it('buildRouteIndex maps detections onto route', () => {
    const route = [{ lat: 0, lng: 0 }, { lat: 0.5, lng: 0.5 }, { lat: 1, lng: 1 }]
    const dets = [
      { lat: 0.1, lng: 0.1, time: 10 },
      { lat: 0.9, lng: 0.9, time: 20 },
    ]
    const idx = buildRouteIndex(route, dets)
    expect(idx.length).toBe(2)
    expect(idx[0].fraction).toBeLessThan(idx[1].fraction)
  })
})