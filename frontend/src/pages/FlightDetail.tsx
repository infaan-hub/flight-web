import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"
import FlightMap from "../components/FlightMap"
import { getFlightDetail } from "../services/api"
import type { FlightDetail as FlightDetailType, LiveFlight } from "../types"
import {
  Plane,
  MapPin,
  Clock,
  Calendar,
  Building2,
  ArrowRight,
  Loader2,
  Compass,
  Gauge,
  ArrowUp,
  ArrowLeft,
} from "lucide-react"

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  landed: "bg-gray-100 text-gray-800",
  delayed: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
}

export default function FlightDetail() {
  const { flightNumber } = useParams<{ flightNumber: string }>()
  const [flight, setFlight] = useState<FlightDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!flightNumber) return
    setLoading(true)
    getFlightDetail(flightNumber.toUpperCase())
      .then(setFlight)
      .catch(() => setError("Flight not found"))
      .finally(() => setLoading(false))
  }, [flightNumber])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="container-custom py-8 text-center">
        <Plane className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">Flight Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "No flight data available"}</p>
        <Link to="/search">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Search Again
          </Button>
        </Link>
      </div>
    )
  }

  const liveFlightData: LiveFlight[] = flight.latitude && flight.longitude
    ? [{
        icao24: "",
        callsign: flight.flight_number,
        origin_country: flight.departure_country || "",
        latitude: flight.latitude,
        longitude: flight.longitude,
        altitude: flight.altitude,
        velocity: flight.speed,
        heading: flight.heading,
        vertical_rate: null,
        on_ground: false,
        last_contact: null,
        departure_airport: flight.departure_airport,
        arrival_airport: flight.arrival_airport,
        departure_airport_info: flight.departure_airport_info,
        arrival_airport_info: flight.arrival_airport_info,
        airline: flight.airline || null,
        aircraft_type: flight.aircraft_type || null,
        departure_terminal: flight.departure_terminal || null,
        departure_gate: flight.departure_gate || null,
        arrival_terminal: flight.arrival_terminal || null,
        arrival_gate: flight.arrival_gate || null,
        departure_delay: flight.departure_delay ?? null,
        arrival_delay: flight.arrival_delay ?? null,
        departure_time_scheduled: flight.departure_time_scheduled || null,
        arrival_time_scheduled: flight.arrival_time_scheduled || null,
      }]
    : []

  return (
    <div className="container-custom py-8 space-y-6">
      <Link to="/flights">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Flights
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{flight.flight_number}</h1>
            <p className="text-muted-foreground">{flight.airline}</p>
          </div>
        </div>
        <Badge className={`text-sm px-4 py-1.5 ${statusColors[flight.status] || ""}`}>
          {flight.status?.toUpperCase() || "UNKNOWN"}
        </Badge>
      </div>

      {liveFlightData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Live Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FlightMap flights={liveFlightData} center={[flight.latitude || 30, flight.longitude || 0]} zoom={6} />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {flight.altitude && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ArrowUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Altitude</p>
                <p className="text-lg font-bold">{Math.round(flight.altitude).toLocaleString()} ft</p>
              </div>
            </CardContent>
          </Card>
        )}
        {flight.speed && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Gauge className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Speed</p>
                <p className="text-lg font-bold">{Math.round(flight.speed)} kts</p>
              </div>
            </CardContent>
          </Card>
        )}
        {flight.heading && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Compass className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Heading</p>
                <p className="text-lg font-bold">{flight.heading}°</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Departure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{flight.departure_airport}</p>
              <p className="text-muted-foreground">{flight.departure_airport_name}</p>
              <p className="text-sm text-muted-foreground">
                {flight.departure_city}, {flight.departure_country}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              {flight.departure_time_scheduled && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="font-medium">
                      {new Date(flight.departure_time_scheduled).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {flight.departure_time_actual && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-medium">
                      {new Date(flight.departure_time_actual).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {flight.departure_terminal && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Terminal</p>
                    <p className="font-medium">{flight.departure_terminal}</p>
                  </div>
                </div>
              )}
              {flight.departure_gate && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Gate</p>
                    <p className="font-medium">{flight.departure_gate}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              Arrival
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-bold">{flight.arrival_airport}</p>
              <p className="text-muted-foreground">{flight.arrival_airport_name}</p>
              <p className="text-sm text-muted-foreground">
                {flight.arrival_city}, {flight.arrival_country}
              </p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              {flight.arrival_time_scheduled && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="font-medium">
                      {new Date(flight.arrival_time_scheduled).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {flight.arrival_time_actual && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-medium">
                      {new Date(flight.arrival_time_actual).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {flight.arrival_terminal && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Terminal</p>
                    <p className="font-medium">{flight.arrival_terminal}</p>
                  </div>
                </div>
              )}
              {flight.arrival_gate && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Gate</p>
                    <p className="font-medium">{flight.arrival_gate}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {flight.aircraft_type && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Aircraft Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Aircraft Type</p>
                <p className="font-medium">{flight.aircraft_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Flight Date</p>
                <p className="font-medium">{flight.flight_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Airline</p>
                <p className="font-medium">{flight.airline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
