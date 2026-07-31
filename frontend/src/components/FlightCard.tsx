import { Link } from "react-router-dom"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Plane, Clock, MapPin } from "lucide-react"
import type { FlightDetail } from "../types"

interface FlightCardProps {
  flight: FlightDetail
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  landed: "bg-gray-100 text-gray-800",
  delayed: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
}

export default function FlightCard({ flight }: FlightCardProps) {
  const depTime = flight.departure_time_scheduled
    ? new Date(flight.departure_time_scheduled).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—"
  const arrTime = flight.arrival_time_scheduled
    ? new Date(flight.arrival_time_scheduled).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—"

  return (
    <Link to={`/flights/${flight.flight_number}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <span className="font-bold text-lg">{flight.flight_number}</span>
            </div>
            <Badge className={statusColors[flight.status] || ""}>
              {flight.status || "unknown"}
            </Badge>
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
          {flight.aircraft_type && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Aircraft: {flight.aircraft_type}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
