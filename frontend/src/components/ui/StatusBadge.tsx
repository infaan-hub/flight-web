import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { normalizeStatusState, statusStateMeta } from "../../lib/flight"

interface StatusBadgeProps {
  status?: string | null
  className?: string
  /** Show a live pulse dot for in-air flights. */
  pulse?: boolean
}

/**
 * Animated flight-status pill. In-air flights get a pulsing radar dot;
 * cancelled/diverted states get a warning tone. Colors follow the canonical
 * lifecycle vocabulary used across the app.
 */
export default function StatusBadge({ status, className, pulse = true }: StatusBadgeProps) {
  const meta = statusStateMeta(normalizeStatusState(status))
  const inAir = meta.label === "In air"
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.badge, className)}
    >
      {inAir && pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="pulse-ring absolute inset-0 inline-flex text-emerald-400" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {!inAir && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
      {meta.label}
    </motion.span>
  )
}
