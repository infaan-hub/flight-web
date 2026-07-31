import { haversineKm } from "./flight"

export interface LatLng {
  lat: number
  lng: number
}

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/**
 * Spherically-interpolated points along the great-circle arc between two
 * coordinates. A straight line on a flat map is NOT the shortest route, so
 * planned routes must be rendered as geodesic arcs.
 */
export function greatCirclePoints(a: LatLng, b: LatLng, samples = 100): LatLng[] {
  const phi1 = toRad(a.lat)
  const phi2 = toRad(b.lat)
  const dLambda = toRad(b.lng - a.lng)
  const cosD =
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLambda) + Math.sin(phi1) * Math.sin(phi2)
  const d = Math.acos(Math.max(-1, Math.min(1, cosD)))
  if (d < 1e-6) return [a, b]
  const points: LatLng[] = []
  for (let i = 0; i <= samples; i++) {
    const f = i / samples
    const sinFd = Math.sin((1 - f) * d)
    const sinF = Math.sin(f * d)
    const x = sinFd * Math.cos(phi1) * Math.cos(toRad(a.lng)) + sinF * Math.cos(phi2) * Math.cos(toRad(b.lng))
    const y = sinFd * Math.cos(phi1) * Math.sin(toRad(a.lng)) + sinF * Math.cos(phi2) * Math.sin(toRad(b.lng))
    const z = sinFd * Math.sin(phi1) + sinF * Math.sin(phi2)
    points.push({ lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) })
  }
  return points
}

/**
 * Split a polyline wherever it crosses the antimeridian (±180°), otherwise
 * renderers draw a line spanning the whole map (e.g. a Tokyo-London arc).
 */
export function splitAntimeridian(points: LatLng[]): LatLng[][] {
  const segments: LatLng[][] = []
  let current: LatLng[] = []
  for (const p of points) {
    if (current.length > 0 && Math.abs(p.lng - current[current.length - 1].lng) > 180) {
      segments.push(current)
      current = []
    }
    current.push(p)
  }
  if (current.length > 0) segments.push(current)
  return segments
}

/**
 * Fraction (0..1) of the great-circle route from origin to destination
 * completed by `current`. Values are clamped to [0, 1].
 */
export function routeProgress(origin: LatLng, destination: LatLng, current: LatLng): number {
  const total = haversineKm(origin, destination)
  if (total <= 0) return 0
  const done = haversineKm(origin, current)
  return Math.max(0, Math.min(1, done / total))
}

/** Remaining great-circle distance in km from `current` to `destination`. */
export function distanceToDestination(current: LatLng, destination: LatLng): number {
  return haversineKm(current, destination)
}

/** Total great-circle distance between origin and destination, in km. */
export function routeDistanceKm(origin: LatLng, destination: LatLng): number {
  return haversineKm(origin, destination)
}
