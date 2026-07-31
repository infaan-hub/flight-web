import { useEffect, useRef, useState } from "react"
import { getLiveFlights, liveStreamUrl, isEventSourceSupported, type MapBounds } from "../services/api"
import type { LiveFlight } from "../types"

export type LiveSource = "sse" | "poll" | "idle"

interface UseLiveFlightsOptions {
  bounds?: MapBounds | null
  enabled: boolean
  baseIntervalMs?: number
  maxIntervalMs?: number
}

/**
 * Live flight updates via Server-Sent Events when supported, falling back to
 * adaptive polling (exponential backoff on errors, capped). Polling pauses
 * while the tab is hidden to protect API quota.
 */
export function useLiveFlights({ bounds, enabled, baseIntervalMs = 30000, maxIntervalMs = 300000 }: UseLiveFlightsOptions) {
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [source, setSource] = useState<LiveSource>("idle")
  const [loading, setLoading] = useState(true)
  const esRef = useRef<EventSource | null>(null)
  const sseModeRef = useRef(false)
  const cancelledRef = useRef(true)
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds

  const boundsKey = bounds ? `${bounds.lamin},${bounds.lomin},${bounds.lamax},${bounds.lomax}` : "world"

  useEffect(() => {
    if (!enabled) {
      setSource("idle")
      return
    }

    let pollTimer: number | undefined
    let intervalMs = baseIntervalMs
    let failures = 0
    cancelledRef.current = false

    const schedulePoll = () => {
      if (cancelledRef.current || document.hidden) return
      pollTimer = window.setTimeout(poll, intervalMs)
    }

    const poll = async () => {
      try {
        const data = await getLiveFlights(boundsRef.current || undefined)
        if (cancelledRef.current) return
        setFlights(data)
        setLoading(false)
        failures = 0
        intervalMs = baseIntervalMs
      } catch {
        failures += 1
        intervalMs = Math.min(intervalMs * 2, maxIntervalMs)
      }
      if (!cancelledRef.current) schedulePoll()
    }

    const stopSse = () => {
      esRef.current?.close()
      esRef.current = null
      sseModeRef.current = false
    }

    const startSse = () => {
      if (!isEventSourceSupported()) {
        sseModeRef.current = false
        setSource("poll")
        poll()
        return
      }
      sseModeRef.current = true
      setSource("sse")
      const es = new EventSource(liveStreamUrl(boundsRef.current || undefined))
      esRef.current = es
      es.addEventListener("flights", (ev) => {
        try {
          const data = JSON.parse(ev.data) as LiveFlight[]
          if (!cancelledRef.current) {
            setFlights(data)
            setLoading(false)
            failures = 0
          }
        } catch {
          /* ignore malformed frame */
        }
      })
      es.onerror = () => {
        stopSse()
        if (cancelledRef.current) return
        failures += 1
        intervalMs = Math.min(intervalMs * 2, maxIntervalMs)
        setSource("poll")
        schedulePoll()
      }
    }

    const onVisibility = () => {
      if (document.hidden) {
        stopSse()
        clearTimeout(pollTimer)
      } else if (sseModeRef.current) {
        startSse()
      } else {
        intervalMs = baseIntervalMs
        schedulePoll()
      }
    }

    if (document.hidden) {
      sseModeRef.current = false
      setSource("poll")
    } else if (isEventSourceSupported()) {
      startSse()
    } else {
      sseModeRef.current = false
      setSource("poll")
      poll()
    }

    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelledRef.current = true
      clearTimeout(pollTimer)
      stopSse()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [boundsKey, enabled, baseIntervalMs, maxIntervalMs])

  return { flights, setFlights, source, loading }
}
