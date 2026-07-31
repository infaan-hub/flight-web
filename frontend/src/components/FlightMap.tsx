import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { GoogleMap, InfoWindow, useLoadScript, OverlayView, Polyline } from "@react-google-maps/api"
import type { LiveFlight, Airport } from "../types"
import FlightMapLeaflet from "./FlightMapLeaflet"

interface FlightMapProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
  userLocation?: { lat: number; lng: number; label?: string } | null
}

const ZANZIBAR_CENTER: [number, number] = [-6.2222, 39.2249]

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
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    </div>
  )
}

function FlightMarkers({
  flights,
  onSelect,
}: {
  flights: LiveFlight[]
  onSelect: (flight: LiveFlight | null) => void
}) {
  const [selected, setSelected] = useState<LiveFlight | null>(null)
  const [infoPosition, setInfoPosition] = useState<google.maps.LatLngLiteral | null>(null)

  const validFlights = useMemo(
    () => flights.filter((f) => f.latitude != null && f.longitude != null),
    [flights]
  )

  const selectedFlight = useMemo(
    () => validFlights.find((f) => f.icao24 === selected?.icao24) || null,
    [validFlights, selected]
  )

  useEffect(() => {
    if (!selected) return
    const found = validFlights.find((f) => f.icao24 === selected.icao24)
    if (found && found.latitude != null && found.longitude != null) {
      setInfoPosition({ lat: found.latitude, lng: found.longitude })
    } else {
      setSelected(null)
      setInfoPosition(null)
    }
  }, [validFlights, selected])

  const origin = selectedFlight?.departure_airport_info
  const dest = selectedFlight?.arrival_airport_info
  const showOriginRoute =
    selectedFlight &&
    selectedFlight.latitude != null &&
    selectedFlight.longitude != null &&
    origin &&
    origin.latitude != null &&
    origin.longitude != null
  const showDestRoute =
    selectedFlight &&
    selectedFlight.latitude != null &&
    selectedFlight.longitude != null &&
    dest &&
    dest.latitude != null &&
    dest.longitude != null

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

  return (
    <>
      {validFlights.map((f, idx) => (
        <OverlayView
          key={`${f.icao24}-${idx}`}
          position={{ lat: f.latitude!, lng: f.longitude! }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
        >
          <button
            className="cursor-pointer bg-transparent border-0 p-0 hover:scale-110 transition-transform"
            title={`${f.callsign || "Unknown"}`}
            onClick={() => {
              setSelected(f)
              onSelect(f)
            }}
          >
            <PlaneSVG heading={f.heading || 0} color={f.on_ground ? "#6b7280" : "#2563eb"} />
          </button>
        </OverlayView>
      ))}

      {showOriginRoute && (
        <Polyline
          path={[
            { lat: origin!.latitude!, lng: origin!.longitude! },
            { lat: selectedFlight.latitude!, lng: selectedFlight.longitude! },
          ]}
          options={{
            strokeColor: "#94a3b8",
            strokeOpacity: 0.6,
            strokeWeight: 2,
            geodesic: true,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 1.1,
                  fillColor: "#94a3b8",
                  fillOpacity: 0.6,
                },
                offset: "0%",
              },
            ],
          }}
        />
      )}

      {showDestRoute && (
        <>
          <Polyline
            path={[
              { lat: selectedFlight.latitude!, lng: selectedFlight.longitude! },
              { lat: dest!.latitude!, lng: dest!.longitude! },
            ]}
            options={{
              strokeColor: "#2563eb",
              strokeOpacity: 0.85,
              strokeWeight: 3,
              geodesic: true,
              icons: [
                {
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 1.4,
                    fillColor: "#2563eb",
                    fillOpacity: 0.85,
                  },
                  offset: "100%",
                },
              ],
            }}
          />
          <OverlayView
            position={{ lat: dest!.latitude!, lng: dest!.longitude! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
          >
            <DestinationPin airport={dest!} />
          </OverlayView>
        </>
      )}

      {selected && infoPosition && (
        <InfoWindow
          position={infoPosition}
          onCloseClick={() => {
            setSelected(null)
            onSelect(null)
          }}
          options={{
            pixelOffset: new google.maps.Size(0, -20),
            disableAutoPan: false,
          }}
        >
          <div className="p-1 min-w-[180px]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold text-sm">{selected.callsign || "Unknown Flight"}</div>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  selected.on_ground
                    ? "bg-gray-100 text-gray-600"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {selected.on_ground ? "On Ground" : "In Air"}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mt-1.5">
              <div className="flex justify-between gap-4">
                <span>Origin</span>
                <span className="font-medium text-right">{selected.origin_country || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Altitude</span>
                <span className="font-medium">
                  {selected.altitude
                    ? `${Math.round(selected.altitude).toLocaleString()} ft`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Speed</span>
                <span className="font-medium">
                  {selected.velocity ? `${Math.round(selected.velocity)} kts` : "—"}
                </span>
              </div>
              {dest && (
                <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                  <div className="flex items-center gap-1 font-semibold text-blue-700">
                    <span aria-hidden>→</span>
                    {dest.iata || ""} {dest.name}
                  </div>
                  <div className="text-gray-500">
                    {[dest.city, dest.country].filter(Boolean).join(", ") || "—"}
                  </div>
                  {selectedFlight?.latitude != null && distanceToDest != null && (
                    <div className="flex justify-between gap-4 mt-0.5">
                      <span>Remaining</span>
                      <span className="font-medium">
                        {Math.round(distanceToDest).toLocaleString()} km
                        {formatEta(distanceToDest, selected.velocity)
                          ? ` · ${formatEta(distanceToDest, selected.velocity)}`
                          : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

export default function FlightMap({
  flights,
  center = ZANZIBAR_CENTER,
  zoom = 8,
  onBoundsChange,
  userLocation,
}: FlightMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapRef = useRef<google.maps.Map | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: center[0],
    lng: center[1],
  })

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "INVALID_KEY",
    libraries: useMemo(() => ["places"], []),
  })

  const hasApiKey = Boolean(apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY")

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const onUnmount = useCallback(() => {
    mapRef.current = null
  }, [])

  const handleIdle = useCallback(() => {
    const map = mapRef.current
    if (!map || !onBoundsChange) return
    const b = map.getBounds()
    if (!b) {
      onBoundsChange(null)
      return
    }
    const ne = b.getNorthEast()
    const sw = b.getSouthWest()
    onBoundsChange({
      lamin: sw.lat(),
      lomin: sw.lng(),
      lamax: ne.lat(),
      lomax: ne.lng(),
    })
  }, [onBoundsChange])

  useEffect(() => {
    setMapCenter({ lat: center[0], lng: center[1] })
    if (mapRef.current) {
      mapRef.current.panTo({ lat: center[0], lng: center[1] })
    }
  }, [center[0], center[1]])

  if (!hasApiKey) {
    return (
      <FlightMapLeaflet flights={flights} center={center} zoom={zoom} onBoundsChange={onBoundsChange} />
    )
  }

  if (loadError) {
    return (
      <div className="w-full h-[500px] rounded-lg border flex items-center justify-center flex-col gap-2 bg-muted p-6 text-center">
        <p className="text-sm font-medium">Google Maps failed to load</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Check your VITE_GOOGLE_MAPS_API_KEY in .env. Make sure the Maps JavaScript API is enabled
          for the project.
        </p>
        <div className="w-full h-[380px] mt-2">
          <FlightMapLeaflet flights={flights} center={center} zoom={zoom} onBoundsChange={onBoundsChange} />
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[500px] rounded-lg border flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "500px" }}
      center={mapCenter}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onIdle={handleIdle}
      options={{
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        zoomControl: true,
      }}
    >
      {userLocation && (
        <OverlayView
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
        >
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
        </OverlayView>
      )}
      <FlightMarkers flights={flights} onSelect={() => {}} />
    </GoogleMap>
  )
}
