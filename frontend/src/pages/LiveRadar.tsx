import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"
import FlightMap from "../components/FlightMap"
import { getLiveFlights, type MapBounds } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { LiveFlight } from "../types"
import { Plane, RefreshCw, Loader2, Search, MapPin, Radio } from "lucide-react"

export default function LiveRadar() {
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())
  const [locating, setLocating] = useState(true)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)

  useEffect(() => {
    getUserLocation().then((loc) => {
      setLocation(loc)
      setLocating(false)
    })
  }, [])

  const fetchFlights = useCallback(async (bounds?: MapBounds | null) => {
    try {
      const data = await getLiveFlights(bounds || undefined)
      setFlights(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFlights(mapBounds)
  }, [fetchFlights, mapBounds])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => fetchFlights(mapBounds), 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchFlights, mapBounds])

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

  const filtered = search.trim()
    ? flights.filter(
        (f) =>
          f.callsign?.toLowerCase().includes(search.toLowerCase()) ||
          f.origin_country?.toLowerCase().includes(search.toLowerCase())
      )
    : flights

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
              if (!autoRefresh) fetchFlights(mapBounds)
            }}
            className={`p-2 rounded-md border transition-colors ${autoRefresh ? "bg-primary/10 border-primary text-primary" : "bg-background text-muted-foreground"}`}
            title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-lg">
              <FlightMap
                flights={filtered}
                center={[location.lat, location.lng]}
                zoom={location.isZanzibar ? 9 : 10}
                onBoundsChange={handleBoundsChange}
                userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                Live Flights ({filtered.length})
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
                      <th className="text-right py-2 px-3 font-medium">Heading</th>
                      <th className="text-center py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">
                          <a href={`/flights/${f.callsign}`} className="text-primary hover:underline">
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
                          {f.heading ? `${f.heading}°` : "—"}
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
