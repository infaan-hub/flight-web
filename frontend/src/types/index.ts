export interface LiveFlight {
  icao24: string
  callsign: string
  origin_country: string
  latitude: number | null
  longitude: number | null
  altitude: number | null
  velocity: number | null
  heading: number | null
  vertical_rate: number | null
  on_ground: boolean
  last_contact: number | null
  departure_airport?: string | null
  arrival_airport?: string | null
  departure_airport_info?: Airport | null
  arrival_airport_info?: Airport | null
}

export interface FlightDetail {
  flight_number: string
  airline: string
  departure_airport: string
  departure_airport_name: string
  departure_city: string
  departure_country: string
  departure_time_scheduled: string
  departure_time_actual: string
  departure_gate: string
  departure_terminal: string
  arrival_airport: string
  arrival_airport_name: string
  arrival_city: string
  arrival_country: string
  arrival_time_scheduled: string
  arrival_time_actual: string
  arrival_gate: string
  arrival_terminal: string
  status: string
  latitude: number | null
  longitude: number | null
  altitude: number | null
  speed: number | null
  heading: number | null
  aircraft_type: string
  flight_date: string
  departure_airport_info?: Airport | null
  arrival_airport_info?: Airport | null
}

export interface FlightStats {
  total_flights_today: number
  flights_in_air: number
  flights_delayed: number
  flights_cancelled: number
  total_airports: number
  total_airlines: number
  busiest_hour: string
  average_delay_minutes: number
}

export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
}
