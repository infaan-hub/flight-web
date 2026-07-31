import type { LiveFlight, FlightDetail, FlightStats, Airport, FlightTrack } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const DEFAULT_TIMEOUT_MS = 15000

const counters = new Map<string, number>()

/**
 * Fetch JSON with a timeout. Returns the response AND a stale guard:
 * when `expectLatest` is used, a response whose request id is no longer the
 * latest FOR THE SAME ENDPOINT is considered stale and throws, so old
 * responses never overwrite newer ones at the call site (concurrent calls to
 * different endpoints are unaffected).
 */
export async function fetchJSON<T>(
  url: string,
  opts: { timeoutMs?: number; expectLatest?: boolean } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, expectLatest = false } = opts
  const pathKey = url.split('?')[0]
  const myId = expectLatest ? (counters.get(pathKey) ?? 0) + 1 : 0
  if (expectLatest) counters.set(pathKey, myId)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    if (expectLatest && myId !== counters.get(pathKey)) {
      throw new Error('Stale response ignored')
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export interface MapBounds {
  lamin: number
  lomin: number
  lamax: number
  lomax: number
}

export function boundsQuery(bounds?: MapBounds): string {
  if (!bounds) return ''
  const query = new URLSearchParams({
    lamin: String(bounds.lamin),
    lomin: String(bounds.lomin),
    lamax: String(bounds.lamax),
    lomax: String(bounds.lomax),
  })
  return `?${query.toString()}`
}

export function getLiveFlights(bounds?: MapBounds): Promise<LiveFlight[]> {
  return fetchJSON<LiveFlight[]>(`${API_BASE}/live-flights/${boundsQuery(bounds)}`, { expectLatest: true })
}

export function searchFlights(params: {
  flight_number?: string
  airline?: string
  departure?: string
  arrival?: string
  date?: string
}): Promise<FlightDetail[]> {
  const query = new URLSearchParams()
  if (params.flight_number) query.set('flight_number', params.flight_number)
  if (params.airline) query.set('airline', params.airline)
  if (params.departure) query.set('departure', params.departure)
  if (params.arrival) query.set('arrival', params.arrival)
  if (params.date) query.set('date', params.date)
  return fetchJSON<FlightDetail[]>(`${API_BASE}/search/?${query.toString()}`, { expectLatest: true })
}

export function getFlightDetail(flightNumber: string): Promise<FlightDetail> {
  return fetchJSON<FlightDetail>(`${API_BASE}/flights/${flightNumber}/`)
}

export function getTodaysFlights(lat?: number, lng?: number, radiusKm?: number): Promise<FlightDetail[]> {
  const params = new URLSearchParams()
  if (lat != null) params.set('lat', String(lat))
  if (lng != null) params.set('lng', String(lng))
  if (radiusKm != null) params.set('radius_km', String(radiusKm))
  const qs = params.toString()
  return fetchJSON<FlightDetail[]>(`${API_BASE}/flights/today/${qs ? `?${qs}` : ''}`, { expectLatest: true })
}

export function getFlightStats(): Promise<FlightStats> {
  return fetchJSON<FlightStats>(`${API_BASE}/stats/`)
}

export function getAirports(): Promise<Airport[]> {
  return fetchJSON<Airport[]>(`${API_BASE}/airports/`)
}

export function getFlightTrack(icao24: string): Promise<FlightTrack> {
  return fetchJSON<FlightTrack>(`${API_BASE}/track/${icao24}/`)
}

export type BoardDirection = 'arrivals' | 'departures'

export function getAirportBoard(iata: string, direction: BoardDirection): Promise<FlightDetail[]> {
  return fetchJSON<FlightDetail[]>(`${API_BASE}/flights/${direction === 'arrivals' ? 'arrival' : 'departure'}/?airport=${iata}`, { expectLatest: true })
}

/**
 * URL for the Server-Sent Events live stream. `EventSource` can't send
 * headers, so bounds travel in the query string.
 */
export function liveStreamUrl(bounds?: MapBounds): string {
  return `${API_BASE}/live/stream/${boundsQuery(bounds)}`
}

export function isEventSourceSupported(): boolean {
  return typeof EventSource !== 'undefined'
}
