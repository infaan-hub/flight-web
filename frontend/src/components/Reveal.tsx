import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right" | "none"
}

/** Fade-and-slide reveal when scrolled into view. */
export default function Reveal({ children, className = "", delay = 0, direction = "up" }: RevealProps) {
  const offsets = {
    up: { y: 28 },
    down: { y: -28 },
    left: { x: 32 },
    right: { x: -32 },
    none: {},
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
