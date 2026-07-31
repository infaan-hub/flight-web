import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { GoogleMap, Marker, InfoWindow, useLoadScript, OverlayView } from "@react-google-maps/api"
import type { LiveFlight } from "../types"
import FlightMapLeaflet from "./FlightMapLeaflet"

interface FlightMapProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
  userLocation?: { lat: number; lng: number; label?: string } | null
}

const ZANZIBAR_CENTER: [number, number] = [-6.2222, 39.2249]

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
          <div className="p-1 min-w-[160px]">
            <div className="font-bold text-sm mb-1">{selected.callsign || "Unknown Flight"}</div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <div>Country: {selected.origin_country || "—"}</div>
              <div>
                Altitude:{" "}
                {selected.altitude ? `${Math.round(selected.altitude).toLocaleString()} ft` : "—"}
              </div>
              <div>
                Speed: {selected.velocity ? `${Math.round(selected.velocity)} kts` : "—"}
              </div>
              <div>Status: {selected.on_ground ? "On Ground" : "In Air"}</div>
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
        <Marker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#2563eb",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          }}
          title={userLocation.label || "Your location"}
        />
      )}
      <FlightMarkers flights={flights} onSelect={() => {}} />
    </GoogleMap>
  )
}
