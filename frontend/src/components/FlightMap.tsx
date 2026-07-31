import { useEffect, useMemo, useState, useCallback } from "react"
import { useRef } from "react"
import { useNavigate } from "react-router-dom"
import Map, { Marker, Popup, Source, Layer, type ViewState, type MapRef } from "react-map-gl/mapbox"
import "mapbox-gl/dist/mapbox-gl.css"
import type { LiveFlight, Airport, FlightTrack } from "../types"
import { haversineKm, formatEta, formatAge, statusStateMeta, normalizeStatusState } from "../lib/flight"
import { greatCirclePoints, splitAntimeridian, type LatLng } from "../lib/routes"

export interface FlightMapRoute {
  origin?: Airport | null
  destination?: Airport | null
  track?: FlightTrack | null
}

interface FlightMapProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
  userLocation?: { lat: number; lng: number; label?: string } | null
  focusFlight?: LiveFlight | null
  route?: FlightMapRoute | null
}

const ZANZIBAR_CENTER: [number, number] = [-6.2222, 39.2249]
const MAP_STYLE = "mapbox://styles/mapbox/dark-v11"
const POSITION_ESTIMATE_AGE_S = 60

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

function AirportPin({ airport, tone }: { airport: Airport; tone: "origin" | "destination" }) {
  const color = tone === "origin" ? "#16a34a" : "#2563eb"
  const bg = tone === "origin" ? "rgba(22, 163, 74, 0.15)" : "rgba(37, 99, 235, 0.15)"
  const text = tone === "origin" ? "#14532d" : "#1e40af"
  return (
    <div
      title={`${airport.name} (${airport.iata})`}
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: `3px solid ${color}`,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: text,
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

/** OpenSky position_source values. */
const POSITION_SOURCES: Record<number, string> = {
  0: "ADS-B",
  1: "ASTERIX",
  2: "MLAT",
  3: "FLARM",
}

function isEstimatedPosition(f: LiveFlight): boolean {
  if (f.is_stale) return true
  if (f.last_contact && Date.now() / 1000 - f.last_contact > POSITION_ESTIMATE_AGE_S) return true
  return false
}

function toLineString(points: LatLng[]): { type: "LineString" | "MultiLineString"; coordinates: number[][] | number[][][] } {
  const segments = splitAntimeridian(points)
  if (segments.length === 1) {
    return {
      type: "LineString",
      coordinates: segments[0].map((p) => [p.lng, p.lat]),
    }
  }
  return {
    type: "MultiLineString",
    coordinates: segments.map((s) => s.map((p) => [p.lng, p.lat])),
  }
}

function geodesicFeature(kind: string, a: LatLng, b: LatLng, samples = 60): Record<string, unknown> {
  return {
    type: "Feature",
    properties: { kind },
    geometry: toLineString(greatCirclePoints(a, b, samples)),
  }
}

function trackFeature(track: FlightTrack): Record<string, unknown> {
  const maxPoints = 600
  const path = track.path.filter((p) => p.latitude != null && p.longitude != null)
  const step = Math.max(1, Math.ceil(path.length / maxPoints))
  const sampled = path.filter((_, i) => i % step === 0 || i === path.length - 1)
  const segments = splitAntimeridian(sampled.map((p) => ({ lat: p.latitude!, lng: p.longitude! })))
  const geometry =
    segments.length === 1
      ? {
          type: "LineString" as const,
          coordinates: segments[0].map((p) => [p.lng, p.lat]),
        }
      : {
          type: "MultiLineString" as const,
          coordinates: segments.map((s) => s.map((p) => [p.lng, p.lat])),
        }
  return { type: "Feature", properties: { kind: "track" }, geometry }
}

export default function FlightMap({
  flights,
  center = ZANZIBAR_CENTER,
  zoom = 8,
  onBoundsChange,
  userLocation,
  focusFlight,
  route,
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
          estimated: isEstimatedPosition(f),
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

  // Route lines: mini origin/current/destination arcs for a selected flight
  // (radar/home), or a full origin-destination route with an optional real
  // track (flight detail). Planned legs are geodesic arcs.
  const routeGeoJson = useMemo(() => {
    const features: unknown[] = []
    const pushArc = (kind: string, a: LatLng | null | undefined, b: LatLng | null | undefined) => {
      if (!a || !b) return
      features.push(geodesicFeature(kind, a, b))
    }
    if (selectedFlight && selectedFlight.latitude != null && selectedFlight.longitude != null) {
      const pos = { lat: selectedFlight.latitude, lng: selectedFlight.longitude }
      if (origin && origin.latitude != null && origin.longitude != null) {
        pushArc("origin", { lat: origin.latitude, lng: origin.longitude }, pos)
      }
      if (dest && dest.latitude != null && dest.longitude != null) {
        pushArc("dest", pos, { lat: dest.latitude, lng: dest.longitude })
      }
    }
    if (route) {
      const ro = route.origin
      const rd = route.destination
      if (route.track && route.track.path.length > 1) {
        features.push(trackFeature(route.track))
      } else if (ro && ro.latitude != null && ro.longitude != null && rd && rd.latitude != null && rd.longitude != null) {
        features.push(
          geodesicFeature("planned", { lat: ro.latitude, lng: ro.longitude }, { lat: rd.latitude, lng: rd.longitude }, 100)
        )
      }
    }
    return { type: "FeatureCollection", features }
  }, [selectedFlight, origin, dest, route])

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

  const routePins = route
    ? { origin: route.origin || null, destination: route.destination || null }
    : { origin: origin || null, destination: dest || null }

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
                  "#22d3ee",
                  10,
                  "#38bdf8",
                  50,
                  "#a78bfa",
                ],
                "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 28],
                "circle-stroke-width": 2,
                "circle-stroke-color": "rgba(255,255,255,0.85)",
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
              paint={{ "text-color": "#0b1120" }}
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
                // Estimated positions (no fresh contact from an ADS-B receiver)
                // are dimmed to distinguish them from confirmed positions.
                "icon-opacity": ["case", ["get", "estimated"], 0.35, 1],
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
                background: "#22d3ee",
                border: "3px solid rgba(255,255,255,0.9)",
                boxShadow: "0 0 16px rgba(34,211,238,0.6)",
              }}
            />
          </Marker>
        )}

        {routePins.origin && routePins.origin.latitude != null && routePins.origin.longitude != null && (
          <Marker longitude={routePins.origin.longitude} latitude={routePins.origin.latitude} anchor="center">
            <AirportPin airport={routePins.origin} tone="origin" />
          </Marker>
        )}

        {routePins.destination && routePins.destination.latitude != null && routePins.destination.longitude != null && (
          <Marker longitude={routePins.destination.longitude} latitude={routePins.destination.latitude} anchor="center">
            <AirportPin airport={routePins.destination} tone="destination" />
          </Marker>
        )}

        {routeGeoJson.features.length > 0 && (
          <Source id="flight-route" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-dashed"
              type="line"
              filter={["match", ["get", "kind"], ["origin", "planned"], true, false]}
              paint={{
                "line-color": "#64748b",
                "line-width": 2,
                "line-opacity": 0.7,
                "line-dasharray": [2, 2],
              }}
            />
            <Layer
              id="route-track"
              type="line"
              filter={["==", ["get", "kind"], "track"]}
              paint={{
                "line-color": "#22d3ee",
                "line-width": 2.5,
                "line-opacity": 0.9,
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
            const estimated = isEstimatedPosition(s)
            const state = statusStateMeta(
              s.on_ground ? normalizeStatusState("landed") : normalizeStatusState("active")
            )
            const posSource = s.position_source != null ? POSITION_SOURCES[s.position_source] : null
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
                      {s.airline && <div className="text-[11px] text-slate-400">{s.airline}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${state.badge}`}>
                        {s.on_ground ? "On Ground" : state.label}
                      </span>
                      {s.arrival_delay != null && s.arrival_delay > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-300 border border-red-400/20">
                          Delayed {s.arrival_delay}m
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 mt-1.5">
                    {estimated && (
                      <div className="flex items-center gap-1 text-[11px] italic text-amber-300">
                        Estimated position
                        {s.last_contact ? ` · ${formatAge(s.last_contact)}` : ""}
                      </div>
                    )}
                    {s.position_jump && (
                      <div className="text-[11px] italic text-orange-300">
                        Unusual position jump detected (possible receiver glitch)
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span>Origin</span>
                      <span className="font-medium text-right">
                        {s.origin_country || s.departure_airport || "—"}
                      </span>
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
                    {(posSource || s.sensor_count != null) && (
                      <div className="flex justify-between gap-4">
                        <span>Signal</span>
                        <span className="font-medium">
                          {posSource || "—"}
                          {s.sensor_count != null ? ` · ${s.sensor_count} sensor${s.sensor_count === 1 ? "" : "s"}` : ""}
                        </span>
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
                      <div className="border-t border-white/10 pt-1.5 mt-1.5">
                        <div className="flex items-center gap-1 font-semibold text-sky-400">
                          <span aria-hidden>→</span>
                          {dest.iata || ""} {dest.name}
                        </div>
                        <div className="text-slate-400">
                          {[dest.city, dest.country].filter(Boolean).join(", ") || "—"}
                        </div>
                        {(s.arrival_terminal || s.arrival_gate) && (
                          <div className="text-slate-400">
                            Terminal {s.arrival_terminal || "—"}
                            {s.arrival_gate ? ` · Gate ${s.arrival_gate}` : ""}
                          </div>
                        )}
                        {s.arrival_time_scheduled && (
                          <div className="text-slate-400">
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
                      className="mt-2 w-full text-center text-xs font-semibold py-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 transition-colors"
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
