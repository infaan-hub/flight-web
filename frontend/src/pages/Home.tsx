import { useState, useEffect, Suspense, lazy } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
const FlightMap = lazy(() => import("../components/FlightMap"))
import FlightCard from "../components/FlightCard"
import { getLiveFlights, getTodaysFlights, getFlightStats } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { LiveFlight, FlightDetail, FlightStats } from "../types"
import { Plane, Search, Radar, TrendingUp, ArrowRight, MapPin, RotateCw } from "lucide-react"

export default function Home() {
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>([])
  const [todaysFlights, setTodaysFlights] = useState<FlightDetail[]>([])
  const [stats, setStats] = useState<FlightStats | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const [retryTick, setRetryTick] = useState(0)
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())

  useEffect(() => {
    getUserLocation().then(setLocation)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const loc = location
      const [live, today, statsData] = await Promise.allSettled([
        getLiveFlights(loc.bounds),
        getTodaysFlights(loc.lat, loc.lng, loc.isZanzibar ? 2000 : 1200),
        getFlightStats(),
      ])
      if (cancelled) return
      if (live.status === "fulfilled") {
        setLiveFlights(live.value.slice(0, 100))
        setFailed((f) => f.filter((name) => name !== "live"))
      } else {
        setFailed((f) => (f.includes("live") ? f : [...f, "live"]))
      }
      if (today.status === "fulfilled") {
        setTodaysFlights(today.value.slice(0, 6))
        setFailed((f) => f.filter((name) => name !== "today"))
      } else {
        setFailed((f) => (f.includes("today") ? f : [...f, "today"]))
      }
      if (statsData.status === "fulfilled") {
        setStats(statsData.value)
        setFailed((f) => f.filter((name) => name !== "stats"))
      } else {
        setFailed((f) => (f.includes("stats") ? f : [...f, "stats"]))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location, retryTick])

  const allFailed = failed.length === 3

  return (
    <div className="container-custom py-8 space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-background border p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Welcome to SkyTrack
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Track flights in real-time, search flight information, and monitor global air traffic with our comprehensive flight tracking system.
          </p>
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Live flights near <span className="font-medium text-foreground">{location.label}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/search">
              <Button size="lg" className="gap-2">
                <Search className="h-4 w-4" />
                Search Flights
              </Button>
            </Link>
            <Link to="/radar">
              <Button size="lg" variant="outline" className="gap-2">
                <Radar className="h-4 w-4" />
                Live Radar
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {allFailed && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="text-muted-foreground mb-4">
            Couldn't reach the flight data service. If this is the first request in a while, the backend may be waking up — try again.
          </p>
          <Button onClick={() => setRetryTick((t) => t + 1)} className="gap-2">
            <RotateCw className="h-4 w-4" />
            Retry
          </Button>
        </section>
      )}

      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats
            ? [
                { label: "Flights Today", value: stats.total_flights_today.toLocaleString(), icon: Plane, color: "text-blue-600" },
                { label: "In Air Now", value: stats.flights_in_air.toLocaleString(), icon: TrendingUp, color: "text-green-600" },
                { label: "Delayed", value: stats.flights_delayed.toLocaleString(), icon: Plane, color: "text-yellow-600" },
                { label: "Avg Delay", value: `${stats.average_delay_minutes} min`, icon: Plane, color: "text-red-600" },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background border ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Live Flights Near {location.label}
          </h2>
          <Link to="/radar">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="w-full h-[500px] rounded-lg border bg-muted animate-pulse" />
          }
        >
          <FlightMap
            flights={liveFlights}
            center={[location.lat, location.lng]}
            zoom={location.isZanzibar ? 9 : 10}
            userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
          />
        </Suspense>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            Today's Flights Near {location.label}
          </h2>
          <Link to="/flights">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todaysFlights.length > 0
            ? todaysFlights.map((flight) => (
                <FlightCard key={flight.flight_number} flight={flight} />
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>
    </div>
  )
}
