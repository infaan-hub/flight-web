export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatEta(distKm: number, speedKts: number | null | undefined): string | null {
  if (!speedKts || speedKts <= 0) return null
  const hours = distKm / (speedKts * 1.852)
  if (hours < 0) return null
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return h > 0 ? `~${h}h ${m}m` : `~${m}m`
}

export function formatAge(lastContact: number | null | undefined, now: number = Date.now() / 1000): string | null {
  if (!lastContact || lastContact <= 0) return null
  const seconds = Math.max(0, Math.round(now - lastContact))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m ago`
}
