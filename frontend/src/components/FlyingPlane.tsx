import { motion } from "framer-motion"

const PLANE_SVG = (
  <svg viewBox="0 0 64 24" className="w-full h-full" aria-hidden>
    <path
      d="M62 13.5 38 5.5v-3a2.2 2.2 0 0 0-4.3-.6L24 11.5l-15-4.5V5l5-2.6V1.6l6.5 3.2 5.5-2.8V.8a1.5 1.5 0 0 0-2.5-1l-6 5.6L10 8.2v4.2l6-3v3l-5 2.1v5.2c0 .8.6 1.5 1.5 1.5.6 0 1.2-.4 1.4-.9l6.3-10.5L25 8.4l1.6 8.5-3.6 7.4c-.4.9.2 1.9 1.1 1.9.5 0 1-.3 1.3-.8l7.4-10.2L41 14l7.8 16.3a1.6 1.6 0 0 0 2.9-.7L58 17l4-1.2v-2.3z"
      fill="#fff"
    />
  </svg>
)

interface FlyingPlaneProps {
  /** Variant decides the flight path + trigger */
  variant?: "cross" | "takeoff"
  className?: string
  size?: number
}

/**
 * A plane that flies across the viewport when scrolled into view.
 * - "cross": level cruise across the screen (section accent)
 * - "takeoff": climbs diagonally upward (hero accent)
 */
export default function FlyingPlane({ variant = "cross", className = "", size = 96 }: FlyingPlaneProps) {
  const takeoff = variant === "takeoff"
  return (
    <motion.div
      className={`pointer-events-none absolute z-10 ${className}`}
      initial={{ x: takeoff ? "-30vw" : "-20vw", y: takeoff ? "30vh" : "18vh", opacity: 0, rotate: takeoff ? -18 : -6 }}
      whileInView={{ x: "120vw", y: takeoff ? "-28vh" : "6vh", opacity: [0, 1, 1, 0] }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: takeoff ? 5.5 : 7, ease: "easeInOut" }}
      style={{ width: size }}
    >
      <div style={{ transform: "rotate(-6deg)" }}>{PLANE_SVG}</div>
    </motion.div>
  )
}
