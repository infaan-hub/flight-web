import { useEffect, useRef } from "react"
import L from "leaflet"
import type { LiveFlight } from "../types"

interface FlightMapLeafletProps {
  flights: LiveFlight[]
  center?: [number, number]
  zoom?: number
  onBoundsChange?: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number } | null) => void
}

const planeIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  className: "",
})

export default function FlightMapLeaflet({
  flights,
  center = [-6.2222, 39.2249],
  zoom = 8,
  onBoundsChange,
}: FlightMapLeafletProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
    })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)
    map.on("moveend", () => {
      if (!onBoundsChange) return
      const b = map.getBounds()
      onBoundsChange({
        lamin: b.getSouthWest().lat,
        lomin: b.getSouthWest().lng,
        lamax: b.getNorthEast().lat,
        lomax: b.getNorthEast().lng,
      })
    })
    mapInstance.current = map
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const validFlights = flights.filter((f) => f.latitude && f.longitude)
    validFlights.forEach((f) => {
      const marker = L.marker([f.latitude!, f.longitude!], { icon: planeIcon })
        .bindPopup(`
          <b>${f.callsign || "Unknown"}</b><br/>
          Altitude: ${f.altitude ? Math.round(f.altitude) + " ft" : "—"}<br/>
          Speed: ${f.velocity ? Math.round(f.velocity) + " kts" : "—"}<br/>
          Country: ${f.origin_country || "—"}
        `)
        .addTo(map)
      markersRef.current.push(marker)
    })

    if (validFlights.length > 1) {
      const bounds = L.latLngBounds(validFlights.map((f) => [f.latitude!, f.longitude!] as [number, number]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
    }
  }, [flights])

  return <div ref={mapRef} className="w-full h-[500px] rounded-lg border" />
}
