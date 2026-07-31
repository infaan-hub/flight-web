import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
const FlightMap = lazy(() => import("../components/FlightMap"))
import type { MapBounds } from "../services/api"
import { useLiveFlights } from "../hooks/useLiveFlights"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import { formatAge } from "../lib/flight"
import type { LiveFlight } from "../types"
import { RefreshCw, Loader2, Search, MapPin, Radio, Wifi, WifiOff } from "lucide-react"

function stableKey(f: LiveFlight): string {
  if (f.icao24) return `icao:${f.icao24}`
  if (f.callsign) return `cs:${f.callsign}`
  return `pos:${f.latitude ?? 0},${f.longitude ?? 0}`
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
    <div className="container-custom py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live Radar</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            {locating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Detecting your location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Showing flights near <span className="font-medium">{location.label}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {source === "sse" ? (
              <>
                <Wifi className="h-3 w-3 text-green-600" /> Live stream connected
              </>
            ) : source === "poll" ? (
              <>
                <WifiOff className="h-3 w-3 text-amber-600" /> Polling fallback (slower)
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" /> Updates paused
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search callsign..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            onClick={handleLocate}
            disabled={locating}
            className={`p-2 rounded-md border transition-colors ${location.isZanzibar ? "bg-primary/10 border-primary text-primary" : "bg-background text-muted-foreground"}`}
            title="Center map on my location"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              setAutoRefresh(!autoRefresh)
              if (!autoRefresh) setFocusFlight(null)
            }}
            className={`p-2 rounded-md border transition-colors ${autoRefresh ? "bg-primary/10 border-primary text-primary" : "bg-background text-muted-foreground"}`}
            title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh && source !== "idle" ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && flights.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-4 mb-3">
            Positions come from crowdsourced ADS-B receivers; coverage can be missing over oceans and remote
            regions, where markers are dimmed (estimated). "Updated Xs ago" shows data freshness.
          </p>
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <Suspense
                fallback={
                  <div className="w-full h-[500px] bg-muted animate-pulse" />
                }
              >
                <FlightMap
                  flights={filtered}
                  center={[location.lat, location.lng]}
                  zoom={location.isZanzibar ? 9 : 10}
                  onBoundsChange={handleBoundsChange}
                  userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
                  focusFlight={focusFlight}
                />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                Live Flights ({filtered.length})
                <span className="text-xs font-normal text-muted-foreground">
                  {inAir.length} in air · {onGround.length} on ground
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Callsign</th>
                      <th className="text-left py-2 px-3 font-medium">Country</th>
                      <th className="text-right py-2 px-3 font-medium">Altitude</th>
                      <th className="text-right py-2 px-3 font-medium">Speed</th>
                      <th className="text-right py-2 px-3 font-medium">Updated</th>
                      <th className="text-center py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr
                        key={stableKey(f)}
                        onClick={() => setFocusFlight(f)}
                        className={`border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${f.is_stale ? "opacity-50" : ""}`}
                        title="Click to center map"
                      >
                        <td className="py-2 px-3 font-medium">
                          <a
                            href={`/flights/${f.callsign}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary hover:underline"
                          >
                            {f.callsign || "—"}
                          </a>
                        </td>
                        <td className="py-2 px-3">{f.origin_country || "—"}</td>
                        <td className="py-2 px-3 text-right">
                          {f.altitude ? `${Math.round(f.altitude).toLocaleString()} ft` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {f.velocity ? `${Math.round(f.velocity)} kts` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatAge(f.last_contact, now) || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={f.on_ground ? "secondary" : "default"}>
                            {f.on_ground ? "On Ground" : "In Air"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
