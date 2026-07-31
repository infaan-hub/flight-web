import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Select } from "../components/ui/select"
import { Badge } from "../components/ui/badge"
import FlightCard from "../components/FlightCard"
import { searchFlights, getAirports, getAirportBoard, type BoardDirection } from "../services/api"
import type { FlightDetail, Airport } from "../types"
import { Search, Filter, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react"

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-400/10 text-blue-300 border border-blue-400/20",
  active: "bg-green-400/10 text-green-300 border border-green-400/20",
  landed: "bg-white/10 text-slate-300 border border-white/15",
  delayed: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
  cancelled: "bg-red-400/10 text-red-300 border border-red-400/20",
}

export default function FlightSearch() {
  const [flightNumber, setFlightNumber] = useState("")
  const [airline, setAirline] = useState("")
  const [departure, setDeparture] = useState("")
  const [arrival, setArrival] = useState("")
  const [results, setResults] = useState<FlightDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [airports, setAirports] = useState<Airport[]>([])
  const [boardAirport, setBoardAirport] = useState("")
  const [boardDirection, setBoardDirection] = useState<BoardDirection>("departures")
  const [boardFlights, setBoardFlights] = useState<FlightDetail[]>([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardSearched, setBoardSearched] = useState(false)

  useEffect(() => {
    getAirports()
      .then(setAirports)
      .catch(() => setAirports([]))
  }, [])

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

  const handleBoard = useCallback(
    async (airport: string, direction: BoardDirection) => {
      if (!airport) return
      setBoardLoading(true)
      setBoardSearched(true)
      try {
        const data = await getAirportBoard(airport, direction)
        setBoardFlights(data)
      } catch (err) {
        console.error(err)
        setBoardFlights([])
      } finally {
        setBoardLoading(false)
      }
    },
    []
  )

  return (
    <div className="container-custom py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Search Flights</h1>
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
              {results.map((flight, idx) => (
                <FlightCard
                  key={`${flight.flight_number}-${flight.flight_date || ""}-${idx}`}
                  flight={flight}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Airport Board
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Airport</label>
              <Select
                value={boardAirport}
                onChange={(e) => setBoardAirport(e.target.value)}
                options={[
                  { value: "", label: "Select an airport..." },
                  ...airports.map((a) => ({
                    value: a.iata,
                    label: `${a.iata} — ${a.name}, ${a.city}`,
                  })),
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Direction</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={boardDirection === "departures" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setBoardDirection("departures")
                    if (boardAirport) handleBoard(boardAirport, "departures")
                  }}
                >
                  <PlaneTakeoff className="h-4 w-4" /> Departures
                </Button>
                <Button
                  type="button"
                  variant={boardDirection === "arrivals" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setBoardDirection("arrivals")
                    if (boardAirport) handleBoard(boardAirport, "arrivals")
                  }}
                >
                  <PlaneLanding className="h-4 w-4" /> Arrivals
                </Button>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={!boardAirport || boardLoading}
                className="gap-2"
                onClick={() => handleBoard(boardAirport, boardDirection)}
              >
                {boardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Load board
              </Button>
            </div>
          </div>

          {boardLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : boardSearched ? (
            boardFlights.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No {boardDirection} found for this airport.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Flight</th>
                      <th className="text-left py-2 px-3 font-medium">Airline</th>
                      <th className="text-left py-2 px-3 font-medium">
                        {boardDirection === "arrivals" ? "From" : "To"}
                      </th>
                      <th className="text-left py-2 px-3 font-medium">Scheduled</th>
                      <th className="text-center py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardFlights.map((f, idx) => (
                      <tr key={`${f.flight_number}-${f.arrival_time_scheduled}-${idx}`} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">
                          <a href={`/flights/${f.flight_number}`} className="text-primary hover:underline">
                            {f.flight_number}
                          </a>
                        </td>
                        <td className="py-2 px-3">{f.airline || "—"}</td>
                        <td className="py-2 px-3">
                          {boardDirection === "arrivals" ? f.departure_airport : f.arrival_airport}
                        </td>
                        <td className="py-2 px-3">
                          {f.departure_time_scheduled
                            ? new Date(f.departure_time_scheduled).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge className={statusColor[f.status] || ""}>
                            {f.status?.toUpperCase() || "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
