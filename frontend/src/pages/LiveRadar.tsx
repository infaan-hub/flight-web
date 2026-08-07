import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
const FlightMap = lazy(() => import("../components/FlightMap"))
import type { MapBounds } from "../services/api"
import { useLiveFlights } from "../hooks/useLiveFlights"
import { motion } from "framer-motion"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import { formatAge } from "../lib/flight"
import type { LiveFlight } from "../types"
import { Search, MapPin, RefreshCw, Loader2, Wifi, WifiOff, Radio, Plane } from "lucide-react"
import PageHero from "../components/ui/PageHero"
import GlassCard from "../components/ui/GlassCard"
import RadarLoader from "../components/ui/RadarLoader"
import { Link } from "react-router-dom"

function stableKey(f: LiveFlight): string {
  if (f.icao24) return `icao:${f.icao24}`
  if (f.callsign) return `cs:${f.callsign}`
  return `pos:${f.latitude ?? 0},${f.longitude ?? 0}`
}

function SourceChip({ source }: { source: "sse" | "poll" | "idle" }) {
  if (source === "sse")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
        <Wifi className="h-3 w-3" /> Live stream connected
      </span>
    )
  if (source === "poll")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
        <WifiOff className="h-3 w-3" /> Polling fallback
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
      <WifiOff className="h-3 w-3" /> Updates paused
    </span>
  )
}

export default function LiveRadar() {
  const [search, setSearch] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())
  const [locating, setLocating] = useState(true)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [focusFlight, setFocusFlight] = useState<LiveFlight | null>(null)
  const [now, setNow] = useState(Date.now() / 1000)

  useEffect(() => {
    getUserLocation().then((loc) => {
      setLocation(loc)
      setLocating(false)
    })
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 10000)
    return () => clearInterval(t)
  }, [])

  const { flights, source, loading } = useLiveFlights({
    bounds: mapBounds,
    enabled: autoRefresh,
  })

  const handleBoundsChange = useCallback((bounds: MapBounds | null) => {
    setMapBounds(bounds)
  }, [])

  const handleLocate = () => {
    setLocating(true)
    getUserLocation().then((loc) => {
      setLocation(loc)
      setLocating(false)
      setMapBounds(loc.bounds)
    })
  }

  const filtered = useMemo(
    () =>
      search.trim()
        ? flights.filter(
            (f) =>
              f.callsign?.toLowerCase().includes(search.toLowerCase()) ||
              f.origin_country?.toLowerCase().includes(search.toLowerCase())
          )
        : flights,
    [flights, search]
  )

  const inAir = filtered.filter((f) => !f.on_ground)
  const onGround = filtered.filter((f) => f.on_ground)

  return (
    <div className="space-y-8">
      <PageHero
        kicker="Live radar"
        video="skyThroughWindow"
        title={
          <>
            Watch the sky, <span className="text-gradient-sky">as it happens.</span>
          </>
        }
        description={
          <>
            {locating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Detecting your location…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-400" />
                Showing flights near <span className="font-semibold text-slate-100">{location.label}</span>
              </span>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SourceChip source={source} />
          <div className="glass inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-bold text-white">{filtered.length}</span> tracked
            </span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-emerald-300">{inAir.length} in air</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="text-slate-400">{onGround.length} on ground</span>
          </div>
        </div>
      </PageHero>

      <div className="container-custom space-y-6">
        {/* Controls */}
        <GlassCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search callsign or country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 focus-visible:border-sky-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLocate}
              disabled={locating}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                location.isZanzibar
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-sky-400/40"
              }`}
              title="Center map on my location"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              <span className="hidden sm:inline">{location.isZanzibar ? "Zanzibar" : "Locate"}</span>
            </button>
            <button
              onClick={() => {
                setAutoRefresh(!autoRefresh)
                if (!autoRefresh) setFocusFlight(null)
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                autoRefresh
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-sky-400/40"
              }`}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh && source !== "idle" ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Auto</span>
            </button>
          </div>
        </GlassCard>

        {loading && flights.length === 0 ? (
          <RadarLoader label="Sweeping the radar" />
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Positions come from crowdsourced ADS-B receivers; coverage can be missing over oceans and remote
              regions, where markers are dimmed (estimated).
            </p>

            <GlassCard className="overflow-hidden p-1.5">
              <Suspense fallback={<div className="skeleton h-[500px] w-full rounded-xl" />}>
                <FlightMap
                  flights={filtered}
                  center={[location.lat, location.lng]}
                  zoom={location.isZanzibar ? 9 : 10}
                  onBoundsChange={handleBoundsChange}
                  userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
                  focusFlight={focusFlight}
                />
              </Suspense>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <h2 className="font-display flex items-center gap-2 text-lg font-bold">
                  <Radio className="h-5 w-5 text-sky-400" />
                  Live flights
                  <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-300">
                    {filtered.length}
                  </span>
                </h2>
                <p className="hidden text-xs text-slate-500 sm:block">
                  {inAir.length} in air · {onGround.length} on ground · click a row to center the map
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 pl-5 pr-3 font-medium">Callsign</th>
                      <th className="py-3 px-3 font-medium">Country</th>
                      <th className="py-3 px-3 text-right font-medium">Altitude</th>
                      <th className="py-3 px-3 text-right font-medium">Speed</th>
                      <th className="py-3 px-3 text-right font-medium">Updated</th>
                      <th className="py-3 pr-5 pl-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <motion.tr
                        key={stableKey(f)}
                        onClick={() => setFocusFlight(f)}
                        className={`border-b border-white/5 last:border-0 hover:bg-sky-400/5 ${
                          f.is_stale ? "opacity-40" : ""
                        } cursor-pointer transition-colors`}
                        title="Click to center map"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(filtered.indexOf(f) * 0.02, 0.5) }}
                      >
                        <td className="py-3 pl-5 pr-3 font-semibold">
                          <Link
                            to={`/flights/${f.callsign}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sky-400 transition-colors hover:text-sky-300"
                          >
                            {f.callsign || "—"}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{f.origin_country || "—"}</td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {f.altitude ? `${Math.round(f.altitude).toLocaleString()} ft` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {f.velocity ? `${Math.round(f.velocity)} kts` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                          {formatAge(f.last_contact, now) || "—"}
                        </td>
                        <td className="py-3 pr-5 pl-3 text-center">
                          <Badge variant={f.on_ground ? "secondary" : "default"}>
                            {f.on_ground ? "On Ground" : "In Air"}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="py-12 text-center text-sm text-slate-500">
                    No aircraft in this viewport yet — the radar is still sweeping.
                  </p>
                )}
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  )
}
