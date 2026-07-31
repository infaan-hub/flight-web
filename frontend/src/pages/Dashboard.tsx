import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { getFlightStats, getLiveFlights, getAirports } from "../services/api"
import type { FlightStats, LiveFlight, Airport } from "../types"
import {
  Plane,
  Globe,
  Building2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react"

export default function Dashboard() {
  const [stats, setStats] = useState<FlightStats | null>(null)
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getFlightStats(), getLiveFlights(), getAirports()])
      .then(([s, f, a]) => {
        setStats(s)
        setFlights(f)
        setAirports(a)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  const inAir = flights.filter((f) => !f.on_ground)
  const topCountries = Object.entries(
    flights.reduce<Record<string, number>>((acc, f) => {
      if (f.origin_country) acc[f.origin_country] = (acc[f.origin_country] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="container-custom py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Global aviation statistics and insights
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Today", value: stats.total_flights_today.toLocaleString(), icon: Plane, color: "text-blue-600", bg: "bg-blue-100" },
            { label: "Currently Flying", value: stats.flights_in_air.toLocaleString(), icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
            { label: "Delayed", value: stats.flights_delayed.toLocaleString(), icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
            { label: "Cancelled", value: stats.flights_cancelled.toLocaleString(), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-6">
                <div className={`p-2 rounded-lg w-fit ${item.bg} ${item.color} mb-3`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Top Countries by Flights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCountries.map(([country, count], idx) => (
                <div key={country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="font-medium">{country}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Airports Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Airports</span>
                <span className="font-bold">{stats?.total_airports || airports.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Airlines</span>
                <span className="font-bold">{stats?.total_airlines || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Busiest Hour</span>
                <span className="font-bold">{stats?.busiest_hour || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Delay</span>
                <span className="font-bold">{stats?.average_delay_minutes || "—"} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flights in Air (Live)</span>
                <span className="font-bold">{inAir.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On Ground (Live)</span>
                <span className="font-bold">{flights.length - inAir.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {airports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Featured Airports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {airports.slice(0, 8).map((apt) => (
                <Card key={apt.iata || apt.icao} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-lg">{apt.iata || apt.icao}</span>
                      <span className="text-xs text-muted-foreground">{apt.country}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{apt.name}</p>
                    <p className="text-xs text-muted-foreground">{apt.city}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
