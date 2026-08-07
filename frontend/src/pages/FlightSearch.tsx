import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Input } from "../components/ui/input"
import { Select } from "../components/ui/select"
import FlightCard from "../components/FlightCard"
import { searchFlights, getAirports, getAirportBoard, type BoardDirection } from "../services/api"
import type { FlightDetail, Airport } from "../types"
import { Search, Loader2, PlaneLanding, PlaneTakeoff, Filter } from "lucide-react"
import PageHero from "../components/ui/PageHero"
import GlassCard from "../components/ui/GlassCard"
import AnimatedSection from "../components/ui/AnimatedSection"
import AnimatedButton from "../components/ui/AnimatedButton"
import RadarLoader from "../components/ui/RadarLoader"

export default function FlightSearch() {
  const [params] = useSearchParams()
  const [flightNumber, setFlightNumber] = useState("")
  const [airline, setAirline] = useState("")
  const [departure, setDeparture] = useState(params.get("departure") || "")
  const [arrival, setArrival] = useState(params.get("arrival") || "")
  const [date, setDate] = useState(params.get("date") || "")
  const [results, setResults] = useState<FlightDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [airports, setAirports] = useState<Airport[]>([])
  const [boardAirport, setBoardAirport] = useState("ZNZ")
  const [boardDirection, setBoardDirection] = useState<BoardDirection>("departures")
  const [boardFlights, setBoardFlights] = useState<FlightDetail[]>([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardSearched, setBoardSearched] = useState(false)

  useEffect(() => {
    getAirports()
      .then(setAirports)
      .catch(() => setAirports([]))
  }, [])

  const runSearch = useCallback(async (q: { flight_number?: string; airline?: string; departure?: string; arrival?: string; date?: string }) => {
    setLoading(true)
    setSearched(true)
    try {
      const data = await searchFlights(q)
      setResults(data)
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Deep-link from the hero search bar
  useEffect(() => {
    if (departure || arrival) {
      runSearch({ departure, arrival, date })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch({ flight_number: flightNumber, airline, departure, arrival, date })
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

  const fieldCls = "h-12 rounded-xl border-white/10 bg-white/5 focus-visible:border-sky-400"

  return (
    <div className="space-y-8">
      <PageHero
        kicker="Flight search"
        video="landingTracks"
        title={
          <>
            Find any flight <span className="text-gradient-sky">in seconds.</span>
          </>
        }
        description="Flight number, callsign, airline or route — if it's in the sky, it's in ZanflightGO."
      />

      <div className="container-custom space-y-8">
        {/* ── Search form ── */}
        <AnimatedSection>
          <GlassCard strong className="p-6 md:p-8">
            <form onSubmit={handleSearch} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-medium text-slate-300">Flight number</label>
                  <Input
                    placeholder="e.g. PW715 / UAL123"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-sm font-medium text-slate-300">Airline</label>
                  <Input
                    placeholder="e.g. Precision Air"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">From</label>
                  <Input
                    placeholder="ZNZ"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value.toUpperCase())}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">To</label>
                  <Input
                    placeholder="DAR"
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value.toUpperCase())}
                    className={fieldCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AnimatedButton type="submit" size="lg" variant="primary" shine disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {loading ? "Scanning…" : "Search flights"}
                </AnimatedButton>
                {searched && !loading && (
                  <span className="text-sm text-slate-400">
                    {results.length} flight{results.length !== 1 ? "s" : ""} found
                  </span>
                )}
              </div>
            </form>
          </GlassCard>
        </AnimatedSection>

        {/* ── Results ── */}
        {loading && <RadarLoader label="Scanning flight decks" />}

        {!loading && searched && (
          <div>
            {results.length === 0 ? (
              <AnimatedSection>
                <GlassCard className="p-12 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 opacity-40" />
                  <p className="text-muted-foreground">No flights found. Try different search criteria.</p>
                </GlassCard>
              </AnimatedSection>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((flight, idx) => (
                  <FlightCard key={`${flight.flight_number}-${flight.flight_date || ""}-${idx}`} flight={flight} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Airport board ── */}
        <AnimatedSection>
          <GlassCard strong className="p-6 md:p-8">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold">
              <Filter className="h-5 w-5 text-sky-400" />
              Airport board
            </h2>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-slate-300">Airport</label>
                <Select
                  value={boardAirport}
                  onChange={(e) => setBoardAirport(e.target.value)}
                  options={[
                    ...airports.map((a) => ({
                      value: a.iata,
                      label: `${a.iata} — ${a.name}, ${a.city}`,
                    })),
                  ]}
                  className={fieldCls}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Direction</label>
                <div className="flex gap-2">
                  <AnimatedButton
                    size="sm"
                    variant={boardDirection === "departures" ? "primary" : "outline"}
                    onClick={() => {
                      setBoardDirection("departures")
                      if (boardAirport) handleBoard(boardAirport, "departures")
                    }}
                  >
                    <PlaneTakeoff className="h-4 w-4" /> Departures
                  </AnimatedButton>
                  <AnimatedButton
                    size="sm"
                    variant={boardDirection === "arrivals" ? "primary" : "outline"}
                    onClick={() => {
                      setBoardDirection("arrivals")
                      if (boardAirport) handleBoard(boardAirport, "arrivals")
                    }}
                  >
                    <PlaneLanding className="h-4 w-4" /> Arrivals
                  </AnimatedButton>
                </div>
              </div>
              <AnimatedButton
                size="md"
                variant="glass"
                disabled={!boardAirport || boardLoading}
                onClick={() => handleBoard(boardAirport, boardDirection)}
              >
                {boardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Load board
              </AnimatedButton>
            </div>

            <div className="mt-6">
              {boardLoading ? (
                <RadarLoader label="Loading the board" className="py-10" />
              ) : boardSearched ? (
                boardFlights.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No {boardDirection} found for this airport.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[11px] uppercase tracking-wider text-slate-500">
                          <th className="py-3 pl-5 pr-3 font-medium">Flight</th>
                          <th className="py-3 px-3 font-medium">Airline</th>
                          <th className="py-3 px-3 font-medium">{boardDirection === "arrivals" ? "From" : "To"}</th>
                          <th className="py-3 px-3 font-medium">Scheduled</th>
                          <th className="py-3 pr-5 pl-3 text-center font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boardFlights.map((f, idx) => (
                          <tr
                            key={`${f.flight_number}-${f.arrival_time_scheduled}-${idx}`}
                            className="border-b border-white/5 last:border-0 transition-colors hover:bg-sky-400/5"
                          >
                            <td className="py-3 pl-5 pr-3 font-semibold">
                              <a href={`/flights/${f.flight_number}`} className="text-sky-400 hover:text-sky-300">
                                {f.flight_number}
                              </a>
                            </td>
                            <td className="py-3 px-3 text-slate-400">{f.airline || "—"}</td>
                            <td className="py-3 px-3">{boardDirection === "arrivals" ? f.departure_airport : f.arrival_airport}</td>
                            <td className="py-3 px-3 tabular-nums text-slate-400">
                              {f.departure_time_scheduled
                                ? new Date(f.departure_time_scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </td>
                            <td className="py-3 pr-5 pl-3 text-center">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  f.status?.toLowerCase().includes("delay")
                                    ? "bg-amber-400/10 text-amber-300"
                                    : f.status?.toLowerCase().includes("cancel")
                                      ? "bg-red-400/10 text-red-300"
                                      : "bg-sky-400/10 text-sky-300"
                                }`}
                              >
                                {f.status?.toUpperCase() || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : null}
            </div>
          </GlassCard>
        </AnimatedSection>
      </div>
    </div>
  )
}
