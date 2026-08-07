import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Plane, Clock, ArrowRight } from "lucide-react"
import type { FlightDetail } from "../types"
import { delayVariation, formatLocalApprox } from "../lib/flight"
import StatusBadge from "./ui/StatusBadge"
import GlassCard from "./ui/GlassCard"

interface FlightCardProps {
  flight: FlightDetail
  index?: number
}

/**
 * Glass flight card: animated route arc between airports, pulsing status
 * pill, delay chips and aircraft meta. Hovers lift with a sky glow.
 */
export default function FlightCard({ flight, index = 0 }: FlightCardProps) {
  const depVariation = delayVariation(flight.departure_time_scheduled, flight.departure_time_actual || flight.departure_time_estimated)
  const arrVariation = delayVariation(flight.arrival_time_scheduled, flight.arrival_time_actual || flight.arrival_time_estimated)

  const depTime = flight.departure_time_scheduled
    ? formatLocalApprox(flight.departure_time_scheduled, flight.departure_airport_info?.longitude)
    : null
  const arrTime = flight.arrival_time_scheduled
    ? formatLocalApprox(flight.arrival_time_scheduled, flight.arrival_airport_info?.longitude)
    : null

  const delayChip = (label: string, v: string | null) => {
    if (!v) return null
    const tone =
      v.startsWith("+")
        ? "bg-red-400/10 text-red-300 border-red-400/25"
        : v === "On time"
          ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
          : "bg-sky-400/10 text-sky-300 border-sky-400/25"
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
        {label} {v}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link to={`/flights/${flight.flight_number}`} className="block h-full">
        <GlassCard maxTilt={3} className="group h-full p-5 transition-shadow duration-500 hover:shadow-[0_18px_50px_rgba(2,8,24,0.55),0_0_44px_rgba(56,189,248,0.16)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/25 to-blue-600/25 ring-1 ring-sky-400/30">
                <Plane className="h-4 w-4 text-sky-300 transition-transform duration-500 group-hover:-rotate-12" />
              </span>
              <div>
                <p className="font-display text-lg font-bold tracking-tight">{flight.flight_number}</p>
                <p className="text-[11px] text-slate-400">{flight.airline}</p>
              </div>
            </div>
            <StatusBadge status={flight.status_state || flight.status} />
          </div>

          {/* Route arc */}
          <div className="mt-5 flex items-center gap-3">
            <div className="text-center">
              <p className="font-display text-2xl font-bold tracking-tight">{flight.departure_airport}</p>
              <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {depTime ? depTime.replace("≈", "≈ ") : "—"}
              </p>
            </div>
            <div className="relative flex-1 px-2">
              <div className="h-px w-full bg-gradient-to-r from-sky-400/60 via-sky-400/25 to-blue-500/60" />
              <motion.span
                className="absolute top-1/2 -translate-y-1/2"
                initial={{ left: "0%" }}
                whileInView={{ left: "calc(100% - 14px)" }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
              >
                <Plane className="h-3.5 w-3.5 rotate-45 text-sky-400" />
              </motion.span>
              <ArrowRight className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" aria-hidden />
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold tracking-tight">{flight.arrival_airport}</p>
              <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                {arrTime ? arrTime.replace("≈", "≈ ") : "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {delayChip("Dep", depVariation)}
            {delayChip("Arr", arrVariation)}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-400">
            <span>
              {flight.departure_city || flight.departure_airport_name || "—"} → {flight.arrival_city || flight.arrival_airport_name || "—"}
            </span>
            {flight.aircraft_type && <span className="font-medium text-slate-300">{flight.aircraft_type}</span>}
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}
