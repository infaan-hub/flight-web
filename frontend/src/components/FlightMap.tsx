import { useEffect, useMemo, useState, useCallback } from "react"
import { useRef } from "react"
import { useNavigate } from "react-router-dom"
import Map, { Marker, Popup, Source, Layer, type ViewState, type MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { LiveFlight, Airport } from "../types"
import { haversineKm, formatEta, formatAge } from "../lib/flight"

interface FlightMapProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
  userLocation?: { lat: number; lng: number; label?: string } | null
  focusFlight?: LiveFlight | null
}

const ZANZIBAR_CENTER: [number, number] = [-6.2222, 39.2249]
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11"

const PLANE_PATH =
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"

function planeImageDataUrl(color: string, stroke: string): string {
  const canvas = document.createElement("canvas")
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  ctx.translate(4, 4)
  ctx.scale(1, 1)
  const path = new Path2D(PLANE_PATH)
  ctx.lineJoin = "round"
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke(path)
  ctx.fillStyle = color
  ctx.fill(path)
  return canvas.toDataURL("image/png")
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
  focusFlight,
}: FlightMapProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN || ""
  const navigate = useNavigate()
  const mapRef = useRef<MapRef | null>(null)
  const [spriteReady, setSpriteReady] = useState(false)
  const [viewState, setViewState] = useState<ViewState>({
    longitude: center[1],
    latitude: center[0],
    zoom,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  })
  const [selected, setSelected] = useState<LiveFlight | null>(null)

  const centerLat = center[0]
  const centerLng = center[1]

  useEffect(() => {
    setViewState((vs) => ({ ...vs, longitude: centerLng, latitude: centerLat }))
  }, [centerLat, centerLng])

  useEffect(() => {
    setViewState((vs) => ({ ...vs, zoom }))
  }, [zoom])

  const focusKey = focusFlight ? `${focusFlight.icao24}:${focusFlight.callsign}` : null

  useEffect(() => {
    if (!focusKey || !focusFlight || focusFlight.latitude == null || focusFlight.longitude == null) return
    const map = mapRef.current?.getMap()
    map?.flyTo({
      center: [focusFlight.longitude, focusFlight.latitude],
      zoom: Math.max(viewState.zoom, 8),
      duration: 800,
    })
    setSelected(focusFlight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

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

  const handleLoad = useCallback((e: { target: { loadImage: (url: string, cb: (err?: Error | null, img?: unknown) => void) => void; addImage: (name: string, img: unknown) => void } }) => {
    const map = e.target
    map.loadImage(planeImageDataUrl("#2563eb", "#ffffff"), (err, img) => {
      if (err || !img) return
      map.addImage("plane", img)
      map.loadImage(planeImageDataUrl("#6b7280", "#ffffff"), (err2, img2) => {
        if (err2 || !img2) return
        map.addImage("plane-ground", img2)
        setSpriteReady(true)
      })
    })
  }, [])

  const handleMapClick = useCallback(
    (e: { point: { x: number; y: number } }) => {
      const map = mapRef.current?.getMap()
      if (!map) return
      const features = map.queryRenderedFeatures([e.point.x, e.point.y], { layers: ["planes"] })
      if (!features.length) {
        setSelected(null)
        return
      }
      const feature = features[0] as { properties?: Record<string, unknown> } | undefined
      const props = feature?.properties ?? {}
      const icao24 = props?.icao24 as string | undefined
      const match = icao24 ? validFlightsRef.current.find((f) => f.icao24 === icao24) : undefined
      if (match) setSelected(match)
    },
    []
  )

  const validFlights = useMemo(
    () => flights.filter((f) => f.latitude != null && f.longitude != null),
    [flights]
  )
  const validFlightsRef = useRef(validFlights)
  useEffect(() => {
    validFlightsRef.current = validFlights
  }, [validFlights])

  const flightsGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: validFlights.map((f) => ({
        type: "Feature" as const,
        properties: {
          icao24: f.icao24,
          callsign: f.callsign || "",
          heading: f.heading || 0,
          on_ground: f.on_ground,
          stale: f.is_stale || false,
        },
        geometry: { type: "Point" as const, coordinates: [f.longitude, f.latitude] },
      })),
    }),
    [validFlights]
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
        onLoad={handleLoad}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%" }}
      >
        {spriteReady && (
          <Source
            id="flights-source"
            type="geojson"
            data={flightsGeoJson}
            cluster={true}
            clusterMaxZoom={11}
            clusterRadius={45}
          >
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  "#51bbd6",
                  10,
                  "#f1f075",
                  50,
                  "#f28cb1",
                ],
                "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 28],
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.85,
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 12,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              }}
              paint={{ "text-color": "#1e293b" }}
            />
            <Layer
              id="planes"
              type="symbol"
              filter={["!", ["has", "point_count"]]}
              layout={{
                "icon-image": ["case", ["get", "on_ground"], "plane-ground", "plane"],
                "icon-rotate": ["coalesce", ["get", "heading"], 0],
                "icon-rotation-alignment": "map",
                "icon-allow-overlap": true,
                "icon-pitch-alignment": "map",
                "icon-size": 0.85,
              }}
              paint={{
                "icon-opacity": ["case", ["get", "stale"], 0.35, 1],
              }}
            />
          </Source>
        )}

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
                    {s.last_contact != null && (
                      <div className="flex justify-between gap-4">
                        <span>Updated</span>
                        <span className="font-medium">{formatAge(s.last_contact) || "—"}</span>
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
                  {s.callsign && (
                    <button
                      onClick={() => navigate(`/flights/${s.callsign}`)}
                      className="mt-2 w-full text-center text-xs font-semibold py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      View flight details
                    </button>
                  )}
                </div>
              </Popup>
            )
          })()}
      </Map>
    </div>
  )
}
