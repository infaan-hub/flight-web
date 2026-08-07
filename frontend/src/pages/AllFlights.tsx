import { useState, useEffect } from "react"
import { Input } from "../components/ui/input"
import FlightCard from "../components/FlightCard"
import { getTodaysFlights } from "../services/api"
import { getUserLocation, getDefaultLocation, type LocationInfo } from "../lib/geo"
import type { FlightDetail } from "../types"
import { Search, MapPin } from "lucide-react"
import PageHero from "../components/ui/PageHero"
import GlassCard from "../components/ui/GlassCard"
import RadarLoader from "../components/ui/RadarLoader"
import AnimatedSection from "../components/ui/AnimatedSection"

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

  return (
    <div className="space-y-8">
      <PageHero
        kicker="Today's flights"
        video="takeoffSun"
        title={
          <>
            Everything moving <span className="text-gradient-sky">near you today.</span>
          </>
        }
        description={
          <>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              {location.label}
            </span>{" "}
            · {flights.length} flights scheduled for today
          </>
        }
      >
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by flight, airline, city or airport…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass h-12 rounded-2xl pl-10 focus-visible:border-sky-400"
            aria-label="Filter flights"
          />
        </div>
      </PageHero>

      <div className="container-custom">
        {loading ? (
          <RadarLoader label="Boarding the schedule" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((flight, idx) => (
              <FlightCard key={`${flight.flight_number}-${idx}`} flight={flight} index={idx} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <AnimatedSection>
            <GlassCard className="p-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 opacity-40" />
              <p className="text-muted-foreground">No flights match your search.</p>
            </GlassCard>
          </AnimatedSection>
        )}
      </div>
    </div>
  )
}
