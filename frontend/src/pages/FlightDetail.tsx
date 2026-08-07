import { useState, useEffect, Suspense, lazy } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Button } from "../components/ui/button"
const FlightMap = lazy(() => import("../components/FlightMap"))
import { getFlightDetail, getFlightTrack } from "../services/api"
import type { FlightDetail as FlightDetailType, LiveFlight, FlightTrack } from "../types"
import {
  Plane, MapPin, Clock, Calendar, Building2, Loader2, Compass, Gauge, ArrowUp, ArrowLeft, Route, Info, Luggage,
} from "lucide-react"
import {
  STATUS_STATES, normalizeStatusState, delayVariation, formatUtcTime, formatLocalApprox,
} from "../lib/flight"
import { routeProgress, distanceToDestination, routeDistanceKm } from "../lib/routes"
import type { Airport } from "../types"
import PageHero from "../components/ui/PageHero"
import GlassCard from "../components/ui/GlassCard"
import AnimatedSection from "../components/ui/AnimatedSection"
import RadarLoader from "../components/ui/RadarLoader"
import StatusBadge from "../components/ui/StatusBadge"
import CloudLayer from "../components/cinema/CloudLayer"

function TimeBlock({
  label, iso, lng, highlight,
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-start gap-2.5"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${highlight ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>
        <Clock className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium ${highlight ? "text-emerald-300" : ""}`}>{local || utc}</p>
        <p className="text-[11px] text-muted-foreground">{utc}</p>
      </div>
    </motion.div>
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
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          current === "Canceled"
            ? "border-red-400/20 bg-red-400/10 text-red-300"
            : "border-orange-400/20 bg-orange-400/10 text-orange-300"
        }`}
      >
        This flight is {current.toLowerCase()}.
      </motion.div>
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
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.12 }}
            className="flex min-w-0 flex-1 items-start gap-2"
          >
            <div className="flex flex-col items-center gap-1">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.2 + i * 0.12 }}
                className={`relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full ${
                  reached ? "bg-emerald-500" : "bg-muted"
                }`}
              >
                {reached && (
                  <span className="pulse-ring absolute inset-0 text-emerald-400" />
                )}
              </motion.span>
              {!isLast && (
                <div className={`min-h-6 w-0.5 flex-1 ${reached ? "bg-gradient-to-b from-emerald-500 to-emerald-400/30" : "bg-muted"}`} />
              )}
            </div>
            <div className="min-w-0 pb-2">
              <p className={`text-xs font-semibold ${reached ? "text-emerald-300" : "text-muted-foreground"}`}>{state}</p>
              {stepTimes[state] && (
                <p className="text-[11px] text-muted-foreground">{formatUtcTime(stepTimes[state])}</p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function DataTransparencyNote() {
  return (
    <GlassCard className="border-sky-400/10 p-5">
      <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        <p className="flex items-center gap-1.5 font-semibold text-foreground">
          <Info className="h-3.5 w-3.5 text-sky-400" /> About this data
        </p>
        <p>Statuses follow the standard flight lifecycle: Scheduled → Departed gate → In air → Landed → At gate.</p>
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
      </div>
    </GlassCard>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
      {Object.entries(bandDots).map(([color, pts]) => (
        <polyline
          key={color}
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          className="route-flow"
          style={{ strokeDasharray: "6 6" }}
        />
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
    return <RadarLoader label="Fetching flight data" />
  }

  if (error || !flight) {
    return (
      <div className="container-custom py-24 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Plane className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Flight Not Found</h2>
          <p className="mb-4 text-muted-foreground">{error || "No flight data available"}</p>
          <Link to="/search">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Search Again
            </Button>
          </Link>
        </motion.div>
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

  const depVariation = delayVariation(flight.departure_time_scheduled, flight.departure_time_actual || flight.departure_time_estimated)
  const arrVariation = delayVariation(flight.arrival_time_scheduled, flight.arrival_time_actual || flight.arrival_time_estimated)

  const variationChip = (v: string | null) => {
    if (!v) return null
    const tone = v.startsWith("+")
      ? "bg-red-400/10 text-red-300 border-red-400/25"
      : v === "On time"
        ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
        : "bg-sky-400/10 text-sky-300 border-sky-400/25"
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{v}</span>
  }

  const statCards = [
    { icon: ArrowUp, label: "Altitude", value: flight.altitude ? `${Math.round(flight.altitude).toLocaleString()} ft` : null, color: "text-sky-400 bg-sky-400/10" },
    { icon: Gauge, label: "Speed", value: flight.speed ? `${Math.round(flight.speed)} kts` : null, color: "text-emerald-400 bg-emerald-400/10" },
    { icon: Compass, label: "Heading", value: flight.heading ? `${flight.heading}°` : null, color: "text-purple-400 bg-purple-400/10" },
  ].filter((s) => s.value)

  return (
    <div className="space-y-8">
      <PageHero
        kicker={`${flight.airline} · ${flight.flight_date}`}
        video="pinkSunset"
        title={
          <>
            {flight.flight_number} <span className="text-gradient-sky">flight story</span>
          </>
        }
        description={
          <>
            {flight.airline}
            {flight.flight_icao && flight.flight_icao !== flight.flight_number ? ` · callsign ${flight.flight_icao}` : ""}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={flight.status_state || flight.status} pulse />
          {variationChip(depVariation)}
          {variationChip(arrVariation)}
          {flight.is_stale && (
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
              Position stale — last data may be up to an hour old
            </span>
          )}
          {flight.position_jump && (
            <span className="rounded-full border border-orange-400/25 bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
              Unusual position jump detected
            </span>
          )}
        </div>
      </PageHero>

      <div className="container-custom space-y-6">
        <Link to="/flights" className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-sky-300">
          <ArrowLeft className="h-4 w-4" /> Back to flights
        </Link>

        {/* Route banner */}
        <AnimatedSection>
          <GlassCard strong className="relative overflow-hidden p-6 md:p-8">
            <CloudLayer density={2} intensity={0.4} />
            <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7 }}
                className="text-center md:text-left"
              >
                <p className="font-display text-4xl font-bold tracking-tight md:text-5xl">{airportCode(flight, "departure")}</p>
                <p className="mt-1 text-sm text-slate-400">{flight.departure_airport_name}</p>
                <p className="text-xs text-slate-500">{flight.departure_city}, {flight.departure_country}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.25 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-40 md:w-56">
                  <div className="h-px w-full bg-gradient-to-r from-sky-400/60 via-sky-400 to-blue-500/60" />
                  <motion.span
                    className="absolute -top-[9px] left-0"
                    animate={{ left: ["0%", "calc(100% - 16px)"] }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  >
                    <Plane className="h-4 w-4 rotate-90 text-sky-400" />
                  </motion.span>
                </div>
                {progress != null && (
                  <p className="mt-3 font-grotesk text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    {Math.round(progress * 100)}% complete
                  </p>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-center md:text-right"
              >
                <p className="font-display text-4xl font-bold tracking-tight md:text-5xl">{airportCode(flight, "arrival")}</p>
                <p className="mt-1 text-sm text-slate-400">{flight.arrival_airport_name}</p>
                <p className="text-xs text-slate-500">{flight.arrival_city}, {flight.arrival_country}</p>
              </motion.div>
            </div>
          </GlassCard>
        </AnimatedSection>

        {/* Live position map */}
        {hasLivePosition && (
          <AnimatedSection>
            <GlassCard className="p-1.5">
              <div className="flex items-center gap-2 px-4 py-3">
                <MapPin className="h-4 w-4 text-sky-400" />
                <h2 className="font-display text-base font-bold">Live position</h2>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="pulse-ring absolute inset-0 text-emerald-400" />
                    <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Tracking
                </span>
              </div>
              <Suspense fallback={<div className="skeleton h-[500px] w-full rounded-xl" />}>
                <FlightMap
                  flights={liveFlightData}
                  center={[flight.latitude || 30, flight.longitude || 0]}
                  zoom={6}
                  route={{ origin: depInfo, destination: arrInfo, track }}
                />
              </Suspense>
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <Route className="h-3.5 w-3.5" />
                {track && track.path.length > 1
                  ? "Cyan line: actual flight path (from ADS-B history)."
                  : "Dashed line: planned great-circle route (shortest path); no flight history available yet."}
              </div>
            </GlassCard>
          </AnimatedSection>
        )}

        {/* Status + progress */}
        <AnimatedSection>
          <GlassCard className="p-6">
            <h2 className="font-display flex items-center gap-2 text-base font-bold">
              <Clock className="h-5 w-5 text-sky-400" />
              Flight progress &amp; status
            </h2>
            <div className="mt-6">
              <StatusTimeline flight={flight} />
            </div>
            {progress != null && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Route completed</span>
                  <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.5)]"
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{distTotal != null ? `${Math.round(distTotal).toLocaleString()} km total` : ""}</span>
                  {distRemaining != null && <span className="tabular-nums">{Math.round(distRemaining).toLocaleString()} km remaining</span>}
                </div>
              </div>
            )}
          </GlassCard>
        </AnimatedSection>

        {/* Trail */}
        {trackLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          </div>
        ) : track && track.path.length >= 2 ? (
          <AnimatedSection>
            <GlassCard className="p-6">
              <h2 className="font-display flex items-center gap-2 text-base font-bold">
                <Route className="h-5 w-5 text-sky-400" />
                Flight trail
                <span className="text-xs font-normal text-muted-foreground">
                  {track.path.length} positions
                  {track.startTime ? ` · ${new Date(track.startTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                  {" → "}
                  {track.endTime ? new Date(track.endTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </h2>
              <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <TrackSvg track={track} />
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Below 10k ft</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-400" /> 10k–25k ft</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" /> Cruise</span>
              </div>
            </GlassCard>
          </AnimatedSection>
        ) : null}

        {/* Live telemetry */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map((s, i) => (
              <AnimatedSection key={s.label} delay={i * 0.08}>
                <GlassCard maxTilt={4} className="flex items-center gap-4 p-5">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="font-display text-xl font-bold tabular-nums">{s.value}</p>
                  </div>
                </GlassCard>
              </AnimatedSection>
            ))}
          </div>
        )}

        {/* Departure / Arrival */}
        <div className="grid gap-6 md:grid-cols-2">
          <AnimatedSection>
            <GlassCard className="h-full p-6">
              <h2 className="font-display flex items-center gap-2 text-base font-bold">
                <Plane className="h-5 w-5 rotate-45 text-sky-400" />
                Departure
              </h2>
              <div className="mt-5">
                <p className="font-display text-3xl font-bold">{airportCode(flight, "departure")}</p>
                <p className="mt-1 text-sm text-slate-400">{flight.departure_airport_name} · {flight.departure_city}, {flight.departure_country}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-5 text-sm">
                <TimeBlock label="Scheduled" iso={flight.departure_time_scheduled} lng={airportLng(flight, "departure")} />
                <TimeBlock label="Estimated" iso={flight.departure_time_estimated} lng={airportLng(flight, "departure")} highlight={!!flight.departure_time_actual} />
                <TimeBlock label="Actual" iso={flight.departure_time_actual} lng={airportLng(flight, "departure")} highlight />
                {flight.departure_terminal && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400"><Building2 className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-xs text-muted-foreground">Terminal</p>
                      <p className="font-medium">{flight.departure_terminal}</p>
                    </div>
                  </div>
                )}
                {flight.departure_gate && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400"><MapPin className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-xs text-muted-foreground">Gate</p>
                      <p className="font-medium">{flight.departure_gate}</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <GlassCard className="h-full p-6">
              <h2 className="font-display flex items-center gap-2 text-base font-bold">
                <Plane className="h-5 w-5 -rotate-45 text-sky-400" />
                Arrival
              </h2>
              <div className="mt-5">
                <p className="font-display text-3xl font-bold">{airportCode(flight, "arrival")}</p>
                <p className="mt-1 text-sm text-slate-400">{flight.arrival_airport_name} · {flight.arrival_city}, {flight.arrival_country}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/5 pt-5 text-sm">
                <TimeBlock label="Scheduled" iso={flight.arrival_time_scheduled} lng={airportLng(flight, "arrival")} />
                <TimeBlock label="Estimated" iso={flight.arrival_time_estimated} lng={airportLng(flight, "arrival")} highlight={!!flight.arrival_time_actual} />
                <TimeBlock label="Actual" iso={flight.arrival_time_actual} lng={airportLng(flight, "arrival")} highlight />
                {flight.arrival_terminal && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400"><Building2 className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-xs text-muted-foreground">Terminal</p>
                      <p className="font-medium">{flight.arrival_terminal}</p>
                    </div>
                  </div>
                )}
                {flight.arrival_gate && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400"><MapPin className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-xs text-muted-foreground">Gate</p>
                      <p className="font-medium">{flight.arrival_gate}</p>
                    </div>
                  </div>
                )}
                {flight.arrival_baggage && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400"><Luggage className="h-3.5 w-3.5" /></span>
                    <div>
                      <p className="text-xs text-muted-foreground">Baggage</p>
                      <p className="font-medium">Carousel {flight.arrival_baggage}</p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </AnimatedSection>
        </div>

        {/* Aircraft info */}
        {flight.aircraft_type && (
          <AnimatedSection>
            <GlassCard className="p-6">
              <h2 className="font-display flex items-center gap-2 text-base font-bold">
                <Calendar className="h-5 w-5 text-sky-400" />
                Aircraft information
              </h2>
              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Aircraft type</p>
                  <p className="mt-1 font-medium">{flight.aircraft_type}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Flight date</p>
                  <p className="mt-1 font-medium">{flight.flight_date}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <p className="text-xs text-muted-foreground">Airline</p>
                  <p className="mt-1 font-medium">{flight.airline}</p>
                </div>
              </div>
            </GlassCard>
          </AnimatedSection>
        )}

        <DataTransparencyNote />
      </div>
    </div>
  )
}
