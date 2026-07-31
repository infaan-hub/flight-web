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

/** Canonical flight states (OAG/ICAO-style vocabulary) in lifecycle order. */
export const STATUS_STATES = ["Scheduled", "OutGate", "InAir", "Landed", "InGate"] as const
export type FlightStatusState = (typeof STATUS_STATES)[number] | "Canceled" | "Diverted" | "Unknown"

const STATE_ALIASES: Record<string, FlightStatusState> = {
  scheduled: "Scheduled",
  delayed: "Scheduled",
  boarding: "OutGate",
  outgate: "OutGate",
  departed: "InAir",
  active: "InAir",
  inair: "InAir",
  airborne: "InAir",
  landed: "Landed",
  ingate: "InGate",
  cancelled: "Canceled",
  canceled: "Canceled",
  diverted: "Diverted",
  incident: "Diverted",
  unknown: "Unknown",
}

export function normalizeStatusState(raw?: string | null): FlightStatusState {
  return STATE_ALIASES[(raw || "").trim().toLowerCase()] || "Unknown"
}

export function statusStateMeta(state: string): { label: string; badge: string } {
  switch (normalizeStatusState(state)) {
    case "Scheduled":
      return { label: "Scheduled", badge: "bg-blue-100 text-blue-700" }
    case "OutGate":
      return { label: "Departed gate", badge: "bg-cyan-100 text-cyan-700" }
    case "InAir":
      return { label: "In air", badge: "bg-green-100 text-green-700" }
    case "Landed":
      return { label: "Landed", badge: "bg-slate-100 text-slate-700" }
    case "InGate":
      return { label: "At gate", badge: "bg-slate-100 text-slate-700" }
    case "Canceled":
      return { label: "Canceled", badge: "bg-red-100 text-red-700" }
    case "Diverted":
      return { label: "Diverted", badge: "bg-orange-100 text-orange-700" }
    default:
      return { label: "Unknown", badge: "bg-muted text-muted-foreground" }
  }
}

/**
 * Delay variation of an actual/estimated time vs the scheduled time:
 * "On time" (< 5 min), "+18 min", or "Early 5 min".
 */
export function delayVariation(
  scheduledIso: string | null | undefined,
  actualIso: string | null | undefined
): string | null {
  if (!scheduledIso || !actualIso) return null
  const sched = Date.parse(scheduledIso)
  const actual = Date.parse(actualIso)
  if (Number.isNaN(sched) || Number.isNaN(actual)) return null
  const diffMin = Math.round((actual - sched) / 60000)
  if (Math.abs(diffMin) < 5) return "On time"
  return diffMin > 0 ? `+${diffMin} min` : `Early ${-diffMin} min`
}

/**
 * Approximate local time at a place, derived from its longitude
 * (≈1h per 15°). Not a substitute for official timezone data — the result is
 * labeled "≈" — but far less misleading than a single global timezone.
 */
export function formatLocalApprox(
  iso: string | null | undefined,
  lng: number | null | undefined
): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const offsetH = lng == null ? 0 : Math.round(lng / 15)
  const shifted = new Date(d.getTime() + offsetH * 3600000)
  const hh = String(shifted.getUTCHours()).padStart(2, "0")
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0")
  const sign = offsetH >= 0 ? "+" : "-"
  return `≈${hh}:${mm} (UTC${sign}${Math.abs(offsetH)})`
}

/** UTC wall-clock time, explicitly labeled. */
export function formatUtcTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm} UTC`
}
