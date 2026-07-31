import { Link } from "react-router-dom"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Plane, Clock, MapPin } from "lucide-react"
import type { FlightDetail } from "../types"
import { normalizeStatusState, statusStateMeta, delayVariation, formatUtcTime, formatLocalApprox } from "../lib/flight"

interface FlightCardProps {
  flight: FlightDetail
}

export default function FlightCard({ flight }: FlightCardProps) {
  const state = statusStateMeta(normalizeStatusState(flight.status_state || flight.status))
  const depVariation = delayVariation(flight.departure_time_scheduled, flight.departure_time_actual || flight.departure_time_estimated)
  const arrVariation = delayVariation(flight.arrival_time_scheduled, flight.arrival_time_actual || flight.arrival_time_estimated)

  const depTime = flight.departure_time_scheduled
    ? formatLocalApprox(flight.departure_time_scheduled, flight.departure_airport_info?.longitude)
    : "—"
  const arrTime = flight.arrival_time_scheduled
    ? formatLocalApprox(flight.arrival_time_scheduled, flight.arrival_airport_info?.longitude)
    : "—"

  return (
    <Link to={`/flights/${flight.flight_number}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg">{flight.flight_number}</span>
              {flight.flight_icao && flight.flight_icao !== flight.flight_number && (
                <span className="text-xs text-muted-foreground">{flight.flight_icao}</span>
              )}
            </div>
            <Badge className={state.badge}>{state.label}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold">{flight.departure_airport}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {depTime}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                {flight.departure_city || flight.departure_airport_name}
              </div>
            </div>
            <div className="flex flex-col items-center mx-4">
              <div className="text-xs text-muted-foreground">{flight.airline}</div>
              <div className="w-16 h-px bg-border relative my-1">
                <Plane className="h-3 w-3 text-primary absolute -top-1.5 right-0" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{flight.arrival_airport}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {arrTime}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                {flight.arrival_city || flight.arrival_airport_name}
              </div>
            </div>
          </div>
          {(depVariation || arrVariation) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {depVariation && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${depVariation.startsWith("+") ? "bg-red-400/10 text-red-300 border border-red-400/20" : depVariation === "On time" ? "bg-green-400/10 text-green-300 border border-green-400/20" : "bg-blue-400/10 text-blue-300 border border-blue-400/20"}`}>
                  Dep {depVariation}
                </span>
              )}
              {arrVariation && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${arrVariation.startsWith("+") ? "bg-red-400/10 text-red-300 border border-red-400/20" : arrVariation === "On time" ? "bg-green-400/10 text-green-300 border border-green-400/20" : "bg-blue-400/10 text-blue-300 border border-blue-400/20"}`}>
                  Arr {arrVariation}
                </span>
              )}
            </div>
          )}
          {flight.aircraft_type && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Aircraft: {flight.aircraft_type}
              {flight.departure_time_scheduled && ` · ${formatUtcTime(flight.departure_time_scheduled)}`}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
