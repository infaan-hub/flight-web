import { describe, it, expect } from 'vitest'
import { haversineKm, formatEta, formatAge } from './flight'

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
