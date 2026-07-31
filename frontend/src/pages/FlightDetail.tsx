import { useState, useEffect, Suspense, lazy } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"
const FlightMap = lazy(() => import("../components/FlightMap"))
import { getFlightDetail, getFlightTrack } from "../services/api"
import type { FlightDetail as FlightDetailType, LiveFlight, FlightTrack } from "../types"
import {
  Plane,
  MapPin,
  Clock,
  Calendar,
  Building2,
  Loader2,
  Compass,
  Gauge,
  ArrowUp,
  ArrowLeft,
  Route,
  Info,
  Luggage,
} from "lucide-react"
import {
  STATUS_STATES,
  normalizeStatusState,
  statusStateMeta,
  delayVariation,
  formatUtcTime,
  formatLocalApprox,
} from "../lib/flight"
import { routeProgress, distanceToDestination, routeDistanceKm } from "../lib/routes"
import type { Airport } from "../types"

function TimeBlock({
  label,
  iso,
  lng,
  highlight,
}: {
  label: string
  iso?: string | null
  lng?: number | null
  highlight?: boolean
}) {
  if (!iso) return null
  const local = formatLocalApprox(iso, lng)
  const utc = formatUtcTime(iso)
  return (
    <div className="flex items-start gap-2">
      <Clock className={`h-4 w-4 mt-0.5 ${highlight ? "text-green-600" : "text-muted-foreground"}`} />
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className={`font-medium ${highlight ? "text-green-700" : ""}`}>
          {local || utc}
        </p>
        <p className="text-xs text-muted-foreground">{utc}</p>
      </div>
    </div>
  )
}

function airportCode(flight: FlightDetailType, side: "departure" | "arrival"): string | null {
  const info = side === "departure" ? flight.departure_airport_info : flight.arrival_airport_info
  if (info && info.icao) return `${info.iata} (${info.icao})`
  const icao = side === "departure" ? flight.departure_airport_icao : flight.arrival_airport_icao
  const iata = side === "departure" ? flight.departure_airport : flight.arrival_airport
  if (icao && iata) return `${iata} (${icao})`
  return iata || null
}

function airportLng(flight: FlightDetailType, side: "departure" | "arrival"): number | null {
  const info = side === "departure" ? flight.departure_airport_info : flight.arrival_airport_info
  return info?.longitude ?? null
}

function StatusTimeline({ flight }: { flight: FlightDetailType }) {
  const current = normalizeStatusState(flight.status_state || flight.status)
  const currentIdx = current === "Canceled" || current === "Diverted"
    ? -1
    : (STATUS_STATES as readonly string[]).indexOf(current)

  if (current === "Canceled" || current === "Diverted") {
    return (
      <div
        className={`rounded-lg border px-4 py-3 text-sm font-medium ${
          current === "Canceled"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-orange-200 bg-orange-50 text-orange-700"
        }`}
      >
        This flight is {current.toLowerCase()}.
      </div>
    )
  }

  const stepTimes: Record<string, string | null | undefined> = {
    Scheduled: flight.departure_time_scheduled,
    OutGate: flight.departure_time_actual || flight.departure_time_estimated,
    InAir: flight.departure_time_actual || flight.departure_time_estimated,
    Landed: flight.arrival_time_actual || flight.arrival_time_estimated,
    InGate: flight.arrival_time_actual,
  }

  return (
    <div className="flex items-start justify-between gap-2">
      {STATUS_STATES.map((state, i) => {
        const reached = currentIdx >= i
        const isLast = i === STATUS_STATES.length - 1
        return (
          <div key={state} className="flex-1 flex items-start gap-2 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-3 w-3 rounded-full shrink-0 ${
                  reached ? "bg-green-500" : "bg-muted border border-muted-foreground/30"
                }`}
              />
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-6 ${reached ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
            <div className="pb-2 min-w-0">
              <p className={`text-xs font-semibold ${reached ? "text-green-700" : "text-muted-foreground"}`}>
                {state}
              </p>
              {stepTimes[state] && (
                <p className="text-[11px] text-muted-foreground">
                  {formatUtcTime(stepTimes[state])}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DataTransparencyNote() {
  return (
    <Card className="bg-muted/40">
      <CardContent className="p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="flex items-center gap-1.5 font-semibold text-foreground">
          <Info className="h-3.5 w-3.5" /> About this data
        </p>
        <p>
          Statuses follow the standard flight lifecycle: Scheduled → Departed gate → In air → Landed → At gate.
        </p>
        <p>
          Live positions come from crowdsourced ADS-B receivers. Coverage can be missing over oceans and remote
          regions, where positions are estimated and may lag. Dimmed markers and "Estimated position" notes mark
          these cases.
        </p>
        <p>
          Times are shown in UTC and as an approximate local time (≈, derived from the airport's longitude, ±1h).
          "Estimated" is the current best prediction; "Scheduled" is the timetable; a delay under 5 minutes counts
          as on time.
        </p>
      </CardContent>
    </Card>
  )
}

function TrackSvg({ track }: { track: FlightTrack }) {
  const points = track.path.filter((p) => p.latitude != null && p.longitude != null)
  if (points.length < 2) return null
  const lats = points.map((p) => p.latitude)
  const lngs = points.map((p) => p.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const pad = 0.02
  const latSpan = Math.max(maxLat - minLat, 1e-4) + pad * 2
  const lngSpan = Math.max(maxLng - minLng, 1e-4) + pad * 2
  const W = 720
  const H = 240
  const coords = points.map((p) => ({
    x: ((p.longitude - minLng + pad) / lngSpan) * W,
    y: H - ((p.latitude - minLat + pad) / latSpan) * H,
    alt: p.altitude,
  }))

  // Phase coloring: climb/descent below 10k ft, transition 10k-25k, cruise above.
  const band = (alt: number | null): string => {
    if (alt == null || alt < 10000) return "#94a3b8"
    if (alt < 25000) return "#22d3ee"
    return "#2563eb"
  }
  const bandDots: Record<string, string> = {}
  for (const c of coords) {
    const key = band(c.alt)
    bandDots[key] = (bandDots[key] || "") + `${c.x.toFixed(1)},${c.y.toFixed(1)} `
  }

  const first = coords[0]
  const last = coords[coords.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {Object.entries(bandDots).map(([color, pts]) => (
        <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      ))}
      <circle cx={first.x} cy={first.y} r={4} fill="#94a3b8" />
      <circle cx={last.x} cy={last.y} r={5} fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  )
}

export default function FlightDetail() {
  const { flightNumber } = useParams<{ flightNumber: string }>()
  const [flight, setFlight] = useState<FlightDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [track, setTrack] = useState<FlightTrack | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)

  useEffect(() => {
    if (!flightNumber) return
    setLoading(true)
    getFlightDetail(flightNumber.toUpperCase())
      .then(setFlight)
      .catch(() => setError("Flight not found"))
      .finally(() => setLoading(false))
  }, [flightNumber])

  useEffect(() => {
    if (!flight?.icao24) return
    setTrackLoading(true)
    getFlightTrack(flight.icao24)
      .then(setTrack)
      .catch(() => setTrack(null))
      .finally(() => setTrackLoading(false))
  }, [flight?.icao24])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="container-custom py-8 text-center">
        <Plane className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Flight Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "No flight data available"}</p>
        <Link to="/search">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Search Again
          </Button>
        </Link>
      </div>
    )
  }

  const hasLivePosition = flight.latitude != null && flight.longitude != null
  const liveFlightData: LiveFlight[] = hasLivePosition
    ? [{
        icao24: flight.icao24 || "",
        callsign: flight.flight_number,
        origin_country: flight.departure_country || "",
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude,
        velocity: flight.speed,
        heading: flight.heading,
        vertical_rate: null,
        on_ground: false,
        last_contact: null,
        is_stale: flight.is_stale || false,
        sensor_count: flight.sensor_count ?? null,
        position_jump: flight.position_jump || false,
        departure_airport: flight.departure_airport,
        arrival_airport: flight.arrival_airport,
        departure_airport_info: flight.departure_airport_info,
        arrival_airport_info: flight.arrival_airport_info,
        airline: flight.airline || null,
        aircraft_type: flight.aircraft_type || null,
        departure_terminal: flight.departure_terminal || null,
        departure_gate: flight.departure_gate || null,
        arrival_terminal: flight.arrival_terminal || null,
        arrival_gate: flight.arrival_gate || null,
        departure_delay: flight.departure_delay ?? null,
        arrival_delay: flight.arrival_delay ?? null,
        departure_time_scheduled: flight.departure_time_scheduled || null,
        arrival_time_scheduled: flight.arrival_time_scheduled || null,
      }]
    : []

  const depInfo: Airport | null | undefined = flight.departure_airport_info
  const arrInfo: Airport | null | undefined = flight.arrival_airport_info

  const progress =
    hasLivePosition && depInfo?.latitude != null && depInfo.longitude != null &&
    arrInfo?.latitude != null && arrInfo.longitude != null
      ? routeProgress(
          { lat: depInfo.latitude, lng: depInfo.longitude },
          { lat: arrInfo.latitude, lng: arrInfo.longitude },
          { lat: flight.latitude!, lng: flight.longitude! }
        )
      : null
  const distTotal =
    depInfo?.latitude != null && depInfo.longitude != null && arrInfo?.latitude != null && arrInfo.longitude != null
      ? routeDistanceKm(
          { lat: depInfo.latitude, lng: depInfo.longitude },
          { lat: arrInfo.latitude, lng: arrInfo.longitude }
        )
      : null
  const distRemaining =
    hasLivePosition && arrInfo?.latitude != null && arrInfo.longitude != null
      ? distanceToDestination(
          { lat: flight.latitude!, lng: flight.longitude! },
          { lat: arrInfo.latitude, lng: arrInfo.longitude }
        )
      : null

  const state = statusStateMeta(flight.status_state || flight.status)
  const depVariation = delayVariation(flight.departure_time_scheduled, flight.departure_time_actual || flight.departure_time_estimated)
  const arrVariation = delayVariation(flight.arrival_time_scheduled, flight.arrival_time_actual || flight.arrival_time_estimated)

  return (
    <div className="container-custom py-8 space-y-6">
      <Link to="/flights">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Flights
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{flight.flight_number}</h1>
            <p className="text-muted-foreground">
              {flight.airline}
              {flight.flight_icao && flight.flight_icao !== flight.flight_number
                ? ` · callsign ${flight.flight_icao}`
                : ""}
            </p>
          </div>
        </div>
        <Badge className={`text-sm px-4 py-1.5 ${state.badge}`}>{state.label}</Badge>
      </div>

      {hasLivePosition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Live Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <div className="w-full h-[500px] rounded-lg border bg-muted animate-pulse" />
              }
            >
              <FlightMap
                flights={liveFlightData}
                center={[flight.latitude || 30, flight.longitude || 0]}
                zoom={6}
                route={{ origin: depInfo, destination: arrInfo, track }}
              />
            </Suspense>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Route className="h-3.5 w-3.5" />
              {track && track.path.length > 1
                ? "Cyan line: actual flight path (from ADS-B history)."
                : "Dashed line: planned great-circle route (shortest path); no flight history available yet."}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            Flight Progress &amp; Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusTimeline flight={flight} />
          {progress != null && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Route completed</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {distTotal != null ? `${Math.round(distTotal).toLocaleString()} km total` : ""}
                </span>
                {distRemaining != null && (
                  <span>{Math.round(distRemaining).toLocaleString()} km remaining</span>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {depVariation && (
              <span className={`px-2 py-1 rounded-full font-medium ${depVariation.startsWith("+") ? "bg-red-100 text-red-700" : depVariation === "On time" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                Departure: {depVariation}
              </span>
            )}
            {arrVariation && (
              <span className={`px-2 py-1 rounded-full font-medium ${arrVariation.startsWith("+") ? "bg-red-100 text-red-700" : arrVariation === "On time" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                Arrival: {arrVariation}
              </span>
            )}
            {flight.is_stale && (
              <span className="px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                Position stale — last data may be up to an hour old
              </span>
            )}
            {flight.position_jump && (
              <span className="px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                Unusual position jump detected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {trackLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : track && track.path.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Flight Trail
              <span className="text-xs font-normal text-muted-foreground">
                {track.path.length} positions
                {track.startTime ? ` · ${new Date(track.startTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                {" → "}
                {track.endTime ? new Date(track.endTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrackSvg track={track} />
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Below 10k ft</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> 10k–25k ft</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Cruise</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-3 gap-4">
        {flight.altitude && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Altitude</p>
                <p className="text-lg font-bold">{Math.round(flight.altitude).toLocaleString()} ft</p>
              </div>
            </CardContent>
          </Card>
        )}
        {flight.speed && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Gauge className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Speed</p>
                <p className="text-lg font-bold">{Math.round(flight.speed)} kts</p>
              </div>
            </CardContent>
          </Card>
        )}
        {flight.heading && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Compass className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Heading</p>
                <p className="text-lg font-bold">{flight.heading}°</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Departure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{airportCode(flight, "departure")}</p>
              <p className="text-muted-foreground">{flight.departure_airport_name}</p>
              <p className="text-sm text-muted-foreground">
                {flight.departure_city}, {flight.departure_country}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <TimeBlock label="Scheduled" iso={flight.departure_time_scheduled} lng={airportLng(flight, "departure")} />
              <TimeBlock label="Estimated" iso={flight.departure_time_estimated} lng={airportLng(flight, "departure")} highlight={!!flight.departure_time_actual} />
              <TimeBlock label="Actual" iso={flight.departure_time_actual} lng={airportLng(flight, "departure")} highlight />
              {flight.departure_terminal && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Terminal</p>
                    <p className="font-medium">{flight.departure_terminal}</p>
                  </div>
                </div>
              )}
              {flight.departure_gate && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Gate</p>
                    <p className="font-medium">{flight.departure_gate}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Arrival
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{airportCode(flight, "arrival")}</p>
              <p className="text-muted-foreground">{flight.arrival_airport_name}</p>
              <p className="text-sm text-muted-foreground">
                {flight.arrival_city}, {flight.arrival_country}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <TimeBlock label="Scheduled" iso={flight.arrival_time_scheduled} lng={airportLng(flight, "arrival")} />
              <TimeBlock label="Estimated" iso={flight.arrival_time_estimated} lng={airportLng(flight, "arrival")} highlight={!!flight.arrival_time_actual} />
              <TimeBlock label="Actual" iso={flight.arrival_time_actual} lng={airportLng(flight, "arrival")} highlight />
              {flight.arrival_terminal && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Terminal</p>
                    <p className="font-medium">{flight.arrival_terminal}</p>
                  </div>
                </div>
              )}
              {flight.arrival_gate && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Gate</p>
                    <p className="font-medium">{flight.arrival_gate}</p>
                  </div>
                </div>
              )}
              {flight.arrival_baggage && (
                <div className="flex items-center gap-2">
                  <Luggage className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Baggage</p>
                    <p className="font-medium">Carousel {flight.arrival_baggage}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {flight.aircraft_type && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Aircraft Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Aircraft Type</p>
                <p className="font-medium">{flight.aircraft_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Flight Date</p>
                <p className="font-medium">{flight.flight_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Airline</p>
                <p className="font-medium">{flight.airline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTransparencyNote />
    </div>
  )
}
