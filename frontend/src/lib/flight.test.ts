import { describe, it, expect } from 'vitest'
import { haversineKm, formatEta, formatAge, normalizeStatusState, delayVariation, formatLocalApprox, formatUtcTime } from './flight'
import { greatCirclePoints, splitAntimeridian, routeProgress, distanceToDestination } from './routes'

describe('haversineKm', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineKm({ lat: -6.2222, lng: 39.2249 }, { lat: -6.2222, lng: 39.2249 })).toBeLessThan(0.001)
  })

  it('computes a plausible Zanzibar-to-Dar distance (~70 km)', () => {
    const d = haversineKm({ lat: -6.2222, lng: 39.2249 }, { lat: -6.878, lng: 39.202 })
    expect(d).toBeGreaterThan(50)
    expect(d).toBeLessThan(90)
  })

  it('is symmetric', () => {
    const a = { lat: 51.47, lng: -0.45 }
    const b = { lat: -33.94, lng: 18.6 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
  })
})

describe('formatEta', () => {
  it('returns null for missing or zero speed', () => {
    expect(formatEta(100, null)).toBeNull()
    expect(formatEta(100, 0)).toBeNull()
  })

  it('formats minutes under an hour', () => {
    // 100 km at 400 kts = 100 / (400*1.852) h ≈ 8.1 min
    expect(formatEta(100, 400)).toBe('~8m')
  })

  it('formats hours and minutes', () => {
    // 2000 km at 450 kts ≈ 2.4 h
    expect(formatEta(2000, 450)).toBe('~2h 24m')
  })
})

describe('formatAge', () => {
  const now = 1_000_000_000

  it('returns null for missing last_contact', () => {
    expect(formatAge(null)).toBeNull()
    expect(formatAge(0)).toBeNull()
  })

  it('formats seconds', () => {
    expect(formatAge(now - 15, now)).toBe('15s ago')
  })

  it('formats minutes', () => {
    expect(formatAge(now - 150, now)).toBe('2m ago')
  })

  it('formats hours and minutes', () => {
    expect(formatAge(now - 7500, now)).toBe('2h 5m ago')
  })
})

describe('normalizeStatusState', () => {
  it('maps provider strings to the canonical vocabulary', () => {
    expect(normalizeStatusState('active')).toBe('InAir')
    expect(normalizeStatusState('scheduled')).toBe('Scheduled')
    expect(normalizeStatusState('delayed')).toBe('Scheduled')
    expect(normalizeStatusState('landed')).toBe('Landed')
    expect(normalizeStatusState('cancelled')).toBe('Canceled')
    expect(normalizeStatusState('diverted')).toBe('Diverted')
  })

  it('falls back to Unknown', () => {
    expect(normalizeStatusState('')).toBe('Unknown')
    expect(normalizeStatusState('whatever')).toBe('Unknown')
    expect(normalizeStatusState(null)).toBe('Unknown')
  })
})

describe('delayVariation', () => {
  it('returns null when a time is missing', () => {
    expect(delayVariation(null, '2025-01-01T10:00:00Z')).toBeNull()
    expect(delayVariation('2025-01-01T10:00:00Z', null)).toBeNull()
  })

  it('reports On time within 5 minutes', () => {
    expect(delayVariation('2025-01-01T10:00:00Z', '2025-01-01T10:03:00Z')).toBe('On time')
  })

  it('reports late and early variations', () => {
    expect(delayVariation('2025-01-01T10:00:00Z', '2025-01-01T10:18:00Z')).toBe('+18 min')
    expect(delayVariation('2025-01-01T10:00:00Z', '2025-01-01T09:55:00Z')).toBe('Early 5 min')
  })
})

describe('formatLocalApprox', () => {
  it('approximates local time from longitude', () => {
    // 12:00 UTC at Zanzibar (39E, UTC+3) => ~15:00
    expect(formatLocalApprox('2025-01-01T12:00:00Z', 39.2249)).toContain('≈15:00')
    expect(formatLocalApprox('2025-01-01T12:00:00Z', 39.2249)).toContain('UTC+3')
  })

  it('returns null for missing or invalid input', () => {
    expect(formatLocalApprox(null, 39)).toBeNull()
    expect(formatLocalApprox('not-a-date', 39)).toBeNull()
  })
})

describe('formatUtcTime', () => {
  it('formats an ISO string as UTC', () => {
    expect(formatUtcTime('2025-01-01T12:00:00Z')).toBe('12:00 UTC')
  })
})

describe('greatCirclePoints', () => {
  it('returns the endpoints', () => {
    const pts = greatCirclePoints({ lat: -6.2222, lng: 39.2249 }, { lat: 51.47, lng: -0.45 }, 50)
    expect(pts[0].lat).toBeCloseTo(-6.2222, 4)
    expect(pts[0].lng).toBeCloseTo(39.2249, 4)
    expect(pts[pts.length - 1].lat).toBeCloseTo(51.47, 4)
  })

  it('bends north for a London-bound route (not a straight line)', () => {
    const pts = greatCirclePoints({ lat: -6.2222, lng: 39.2249 }, { lat: 51.47, lng: -0.45 }, 100)
    const mid = pts[50]
    expect(mid.lat).toBeGreaterThan(20)
  })

  it('produces plausible total length', () => {
    const pts = greatCirclePoints({ lat: -6.2222, lng: 39.2249 }, { lat: 51.47, lng: -0.45 }, 200)
    let len = 0
    for (let i = 1; i < pts.length; i++) {
      len += haversineKm(pts[i - 1], pts[i])
    }
    expect(len).toBeGreaterThan(7000)
    expect(len).toBeLessThan(9000)
  })
})

describe('splitAntimeridian', () => {
  it('splits a polyline crossing the dateline', () => {
    const pts = [
      { lat: 35, lng: 179 },
      { lat: 36, lng: 179.5 },
      { lat: 37, lng: -179.5 },
      { lat: 38, lng: -179 },
    ]
    const segments = splitAntimeridian(pts)
    expect(segments.length).toBe(2)
    expect(segments[0].length).toBe(2)
    expect(segments[1].length).toBe(2)
  })

  it('leaves a normal polyline as one segment', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 2 }]
    expect(splitAntimeridian(pts).length).toBe(1)
  })
})

describe('routeProgress', () => {
  it('is 0 at origin and 1 at destination', () => {
    const origin = { lat: -6.2222, lng: 39.2249 }
    const dest = { lat: 51.47, lng: -0.45 }
    expect(routeProgress(origin, dest, origin)).toBe(0)
    expect(routeProgress(origin, dest, dest)).toBe(1)
  })

  it('is roughly halfway mid-route', () => {
    const pts = greatCirclePoints({ lat: -6.2222, lng: 39.2249 }, { lat: 51.47, lng: -0.45 }, 100)
    const p = routeProgress({ lat: -6.2222, lng: 39.2249 }, { lat: 51.47, lng: -0.45 }, pts[50])
    expect(p).toBeGreaterThan(0.4)
    expect(p).toBeLessThan(0.6)
  })

  it('clamps out-of-range positions', () => {
    const origin = { lat: 0, lng: 0 }
    const dest = { lat: 10, lng: 10 }
    expect(routeProgress(origin, dest, { lat: 90, lng: 90 })).toBe(1)
  })
})

describe('distanceToDestination', () => {
  it('returns remaining distance in km', () => {
    const d = distanceToDestination({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(115)
  })
})
