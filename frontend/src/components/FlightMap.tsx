import { useEffect, useMemo, useState, useCallback } from "react"
import Map, { Marker, Popup, Source, Layer, type ViewState, type MapRef } from "react-map-gl/mapbox"
import { useRef } from "react"
import "mapbox-gl/dist/mapbox-gl.css"
import type { LiveFlight, Airport } from "../types"

interface FlightMapProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
  userLocation?: { lat: number; lng: number; label?: string } | null
}

const ZANZIBAR_CENTER: [number, number] = [-6.2222, 39.2249]
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11"

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatEta(distKm: number, speedKts: number | null) {
  if (!speedKts || speedKts <= 0) return null
  const hours = distKm / (speedKts * 1.852)
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return h > 0 ? `~${h}h ${m}m` : `~${m}m`
}

const PLANE_PATH =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"

function PlaneSVG({ heading, color = "#2563eb", size = 30 }: { heading: number; color?: string; size?: number }) {
  return (
    <div style={{ transform: `rotate(${heading}deg)`, width: size, height: size }}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={color}
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PLANE_PATH} />
      </svg>
    </div>
  )
}

function DestinationPin({ airport }: { airport: Airport }) {
  return (
    <div
      title={`${airport.name} (${airport.iata})`}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "3px solid #2563eb",
        background: "rgba(37, 99, 235, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#1e40af",
          background: "#ffffff",
          borderRadius: 999,
          padding: "1px 4px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {airport.iata}
      </span>
    </div>
  )
}

export default function FlightMap({
  flights,
  center = ZANZIBAR_CENTER,
  zoom = 8,
  onBoundsChange,
  userLocation,
}: FlightMapProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN || ""
  const mapRef = useRef<MapRef | null>(null)
  const [viewState, setViewState] = useState<ViewState>({
    longitude: center[1],
    latitude: center[0],
    zoom,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  })
  const [selected, setSelected] = useState<LiveFlight | null>(null)

  useEffect(() => {
    setViewState((vs) => ({ ...vs, longitude: center[1], latitude: center[0] }))
  }, [center[0], center[1]])

  useEffect(() => {
    setViewState((vs) => ({ ...vs, zoom }))
  }, [zoom])

  const handleMove = useCallback(({ viewState: vs }: { viewState: ViewState }) => setViewState(vs), [])

  const handleMoveEnd = useCallback(
    (e: { target: { getBounds: () => { getNorthEast: () => { lat: number; lng: number }; getSouthWest: () => { lat: number; lng: number } } | null } }) => {
      if (!onBoundsChange) return
      const b = e.target.getBounds()
      if (!b) {
        onBoundsChange(null)
        return
      }
      const ne = b.getNorthEast()
      const sw = b.getSouthWest()
      onBoundsChange({ lamin: sw.lat, lomin: sw.lng, lamax: ne.lat, lomax: ne.lng })
    },
    [onBoundsChange]
  )

  const validFlights = useMemo(
    () => flights.filter((f) => f.latitude != null && f.longitude != null),
    [flights]
  )

  const selectedFlight = useMemo(
    () => (selected ? validFlights.find((f) => f.icao24 === selected.icao24) || selected : null),
    [validFlights, selected]
  )

  const origin = selectedFlight?.departure_airport_info
  const dest = selectedFlight?.arrival_airport_info

  const routeGeoJson = useMemo(() => {
    const features: unknown[] = []
    if (selectedFlight && selectedFlight.latitude != null && selectedFlight.longitude != null) {
      if (origin && origin.latitude != null && origin.longitude != null) {
        features.push({
          type: "Feature",
          properties: { kind: "origin" },
          geometry: {
            type: "LineString",
            coordinates: [
              [origin.longitude, origin.latitude],
              [selectedFlight.longitude, selectedFlight.latitude],
            ],
          },
        })
      }
      if (dest && dest.latitude != null && dest.longitude != null) {
        features.push({
          type: "Feature",
          properties: { kind: "dest" },
          geometry: {
            type: "LineString",
            coordinates: [
              [selectedFlight.longitude, selectedFlight.latitude],
              [dest.longitude, dest.latitude],
            ],
          },
        })
      }
    }
    return { type: "FeatureCollection", features }
  }, [selectedFlight, origin, dest])

  const distanceToDest =
    selectedFlight &&
    selectedFlight.latitude != null &&
    selectedFlight.longitude != null &&
    dest &&
    dest.latitude != null &&
    dest.longitude != null
      ? haversineKm(
          { lat: selectedFlight.latitude, lng: selectedFlight.longitude },
          { lat: dest.latitude, lng: dest.longitude }
        )
      : null

  if (!token) {
    return (
      <div className="w-full h-[500px] rounded-lg border flex items-center justify-center bg-muted p-6 text-center">
        <p className="text-sm font-medium">Mapbox is not configured</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Set VITE_MAPBOX_TOKEN in your .env file to show the map.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-[500px] rounded-lg border overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        mapStyle={MAP_STYLE}
        {...viewState}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        style={{ width: "100%", height: "100%" }}
      >
        {validFlights.map((f, idx) => (
          <Marker key={`${f.icao24}-${idx}`} longitude={f.longitude!} latitude={f.latitude!} anchor="center">
            <button
              className="cursor-pointer bg-transparent border-0 p-0 hover:scale-110 transition-transform"
              title={`${f.callsign || "Unknown"}`}
              onClick={() => setSelected(f)}
            >
              <PlaneSVG heading={f.heading || 0} color={f.on_ground ? "#6b7280" : "#2563eb"} />
            </button>
          </Marker>
        ))}

        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div
              title={userLocation.label || "Your location"}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#2563eb",
                border: "3px solid #ffffff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}
            />
          </Marker>
        )}

        {dest && dest.latitude != null && dest.longitude != null && (
          <Marker longitude={dest.longitude} latitude={dest.latitude} anchor="center">
            <DestinationPin airport={dest} />
          </Marker>
        )}

        {routeGeoJson.features.length > 0 && (
          <Source id="flight-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-origin"
              type="line"
              filter={["==", ["get", "kind"], "origin"]}
              paint={{
                "line-color": "#94a3b8",
                "line-width": 2,
                "line-opacity": 0.6,
                "line-dasharray": [2, 2],
              }}
            />
            <Layer
              id="route-dest"
              type="line"
              filter={["==", ["get", "kind"], "dest"]}
              paint={{
                "line-color": "#2563eb",
                "line-width": 3,
                "line-opacity": 0.85,
              }}
            />
          </Source>
        )}

        {selectedFlight &&
          selectedFlight.latitude != null &&
          selectedFlight.longitude != null &&
          (() => {
            const s = selectedFlight
            return (
              <Popup
                longitude={s.longitude!}
                latitude={s.latitude!}
                closeButton={false}
                closeOnClick={false}
                offset={[0, -22]}
                onClose={() => setSelected(null)}
              >
                <div className="p-1 min-w-[190px]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{s.callsign || "Unknown Flight"}</div>
                      {s.airline && <div className="text-[11px] text-gray-500">{s.airline}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          s.on_ground ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {s.on_ground ? "On Ground" : "In Air"}
                      </span>
                      {s.arrival_delay != null && s.arrival_delay > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          Delayed {s.arrival_delay}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 mt-1.5">
                    <div className="flex justify-between gap-4">
                      <span>Origin</span>
                      <span className="font-medium text-right">{s.origin_country || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Altitude</span>
                      <span className="font-medium">
                        {s.altitude ? `${Math.round(s.altitude).toLocaleString()} ft` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Speed</span>
                      <span className="font-medium">
                        {s.velocity ? `${Math.round(s.velocity)} kts` : "—"}
                      </span>
                    </div>
                    {s.aircraft_type && (
                      <div className="flex justify-between gap-4">
                        <span>Aircraft</span>
                        <span className="font-medium">{s.aircraft_type}</span>
                      </div>
                    )}
                    {s.departure_airport && s.departure_airport !== s.arrival_airport && (
                      <div className="flex justify-between gap-4">
                        <span>Departed</span>
                        <span className="font-medium">
                          {s.departure_airport}
                          {s.departure_time_scheduled
                            ? ` · ${new Date(s.departure_time_scheduled).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                          {s.departure_delay != null && s.departure_delay > 0
                            ? ` (+${s.departure_delay}m)`
                            : ""}
                        </span>
                      </div>
                    )}
                    {dest && (
                      <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                        <div className="flex items-center gap-1 font-semibold text-blue-700">
                          <span aria-hidden>→</span>
                          {dest.iata || ""} {dest.name}
                        </div>
                        <div className="text-gray-500">
                          {[dest.city, dest.country].filter(Boolean).join(", ") || "—"}
                        </div>
                        {(s.arrival_terminal || s.arrival_gate) && (
                          <div className="text-gray-500">
                            Terminal {s.arrival_terminal || "—"}
                            {s.arrival_gate ? ` · Gate ${s.arrival_gate}` : ""}
                          </div>
                        )}
                        {s.arrival_time_scheduled && (
                          <div className="text-gray-500">
                            Arrives{" "}
                            {new Date(s.arrival_time_scheduled).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        {distanceToDest != null && (
                          <div className="flex justify-between gap-4 mt-0.5">
                            <span>Remaining</span>
                            <span className="font-medium">
                              {Math.round(distanceToDest).toLocaleString()} km
                              {formatEta(distanceToDest, s.velocity)
                                ? ` · ${formatEta(distanceToDest, s.velocity)}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            )
          })()}
      </Map>
    </div>
  )
}
