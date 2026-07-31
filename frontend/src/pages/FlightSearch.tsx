import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Select } from "../components/ui/select"
import FlightCard from "../components/FlightCard"
import { searchFlights } from "../services/api"
import type { FlightDetail } from "../types"
import { Search, Filter, Loader2 } from "lucide-react"

export default function FlightSearch() {
  const [flightNumber, setFlightNumber] = useState("")
  const [airline, setAirline] = useState("")
  const [departure, setDeparture] = useState("")
  const [arrival, setArrival] = useState("")
  const [results, setResults] = useState<FlightDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSearched(true)
    try {
      const data = await searchFlights({
        flight_number: flightNumber,
        airline,
        departure,
        arrival,
      })
      setResults(data)
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-custom py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Search Flights</h1>
        <p className="text-muted-foreground mt-1">
          Search by flight number, airline, or airport
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Flight Number</label>
                <Input
                  placeholder="e.g. UAL123"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Airline</label>
                <Input
                  placeholder="e.g. United Airlines"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Departure</label>
                <Input
                  placeholder="e.g. JFK"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Arrival</label>
                <Input
                  placeholder="e.g. LAX"
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Searching..." : "Search Flights"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {results.length} flight{results.length !== 1 ? "s" : ""} found
          </h2>
          {results.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No flights found. Try different search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((flight) => (
                <FlightCard key={flight.flight_number + Math.random()} flight={flight} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
