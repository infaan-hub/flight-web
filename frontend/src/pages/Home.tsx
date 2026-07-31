import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import FlightMap from "../components/FlightMap"
import FlightCard from "../components/FlightCard"
import { getLiveFlights, getTodaysFlights, getFlightStats } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { LiveFlight, FlightDetail, FlightStats } from "../types"
import { Plane, Search, Radar, TrendingUp, ArrowRight, MapPin } from "lucide-react"

export default function Home() {
  const [liveFlights, setLiveFlights] = useState<LiveFlight[]>([])
  const [todaysFlights, setTodaysFlights] = useState<FlightDetail[]>([])
  const [stats, setStats] = useState<FlightStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())

  useEffect(() => {
    getUserLocation().then(setLocation)
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      const loc = location
      const [live, today, statsData] = await Promise.all([
        getLiveFlights(loc.bounds),
        getTodaysFlights(loc.lat, loc.lng, loc.isZanzibar ? 2000 : 1200),
        getFlightStats(),
      ])
      setLiveFlights(live.slice(0, 100))
      setTodaysFlights(today.slice(0, 6))
      setStats(statsData)
      setLoading(false)
    }
    fetchAll().catch(console.error)
  }, [location])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

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

      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
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
          ))}
        </section>
      )}

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
        <FlightMap
          flights={liveFlights}
          center={[location.lat, location.lng]}
          zoom={location.isZanzibar ? 9 : 10}
          userLocation={{ lat: location.lat, lng: location.lng, label: location.label }}
        />
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
          {todaysFlights.map((flight) => (
            <FlightCard key={flight.flight_number} flight={flight} />
          ))}
        </div>
      </section>
    </div>
  )
}
