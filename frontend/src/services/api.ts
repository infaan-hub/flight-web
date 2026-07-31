import type { LiveFlight, FlightDetail, FlightStats, Airport } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  return res.json()
}

export interface MapBounds {
  lamin: number
  lomin: number
  lamax: number
  lomax: number
}

export function getLiveFlights(bounds?: MapBounds): Promise<LiveFlight[]> {
  let url = `${API_BASE}/live-flights/`
  if (bounds) {
    const query = new URLSearchParams({
      lamin: String(bounds.lamin),
      lomin: String(bounds.lomin),
      lamax: String(bounds.lamax),
      lomax: String(bounds.lomax),
    })
    url += `?${query.toString()}`
  }
  return fetchJSON<LiveFlight[]>(url)
}

export function getFlightPositions(bounds?: MapBounds): Promise<LiveFlight[]> {
  let url = `${API_BASE}/positions/`
  if (bounds) {
    const query = new URLSearchParams({
      lamin: String(bounds.lamin),
      lomin: String(bounds.lomin),
      lamax: String(bounds.lamax),
      lomax: String(bounds.lomax),
    })
    url += `?${query.toString()}`
  }
  return fetchJSON<LiveFlight[]>(url)
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
  return fetchJSON<FlightDetail[]>(`${API_BASE}/search/?${query.toString()}`)
}

export function getFlightDetail(flightNumber: string): Promise<FlightDetail> {
  return fetchJSON<FlightDetail>(`${API_BASE}/flights/${flightNumber}/`)
}

export function getTodaysFlights(): Promise<FlightDetail[]> {
  return fetchJSON<FlightDetail[]>(`${API_BASE}/flights/today/`)
}

export function getFlightStats(): Promise<FlightStats> {
  return fetchJSON<FlightStats>(`${API_BASE}/stats/`)
}

export function getAirports(): Promise<Airport[]> {
  return fetchJSON<Airport[]>(`${API_BASE}/airports/`)
}
