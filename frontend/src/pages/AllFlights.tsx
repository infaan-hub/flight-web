import { useState, useEffect } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import FlightCard from "../components/FlightCard"
import { getTodaysFlights } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { FlightDetail } from "../types"
import { Loader2, Search, MapPin } from "lucide-react"
import Reveal from "../components/Reveal"

export default function AllFlights() {
  const [flights, setFlights] = useState<FlightDetail[]>([])
  const [filtered, setFiltered] = useState<FlightDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState<LocationInfo>(getDefaultLocation())

  useEffect(() => {
    getUserLocation().then(setLocation)
  }, [])

  useEffect(() => {
    const loc = location
    getTodaysFlights(loc.lat, loc.lng, loc.isZanzibar ? 2000 : 1200)
      .then((data) => {
        setFlights(data)
        setFiltered(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [location])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(flights)
      return
    }
    const q = search.toLowerCase()
    setFiltered(
      flights.filter(
        (f) =>
          f.flight_number.toLowerCase().includes(q) ||
          f.airline?.toLowerCase().includes(q) ||
          f.departure_airport?.toLowerCase().includes(q) ||
          f.arrival_airport?.toLowerCase().includes(q) ||
          f.departure_city?.toLowerCase().includes(q) ||
          f.arrival_city?.toLowerCase().includes(q)
      )
    )
  }, [search, flights])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container-custom py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Today's Flights Near{" "}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-6 w-6 text-primary" /> {location.label}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {flights.length} flights scheduled for today
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter flights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((flight, idx) => (
          <Reveal key={`${flight.flight_number}-${idx}`} delay={Math.min(idx * 0.05, 0.4)}>
            <FlightCard flight={flight} />
          </Reveal>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No flights match your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
