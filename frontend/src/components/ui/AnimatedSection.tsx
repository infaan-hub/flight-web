import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right" | "none"
  /** Larger travel distance for cinematic reveals. */
  distance?: number
}

/**
 * Cinematic scroll reveal: fade + slide + blur, eased with a custom
 * spring-like cubic. Used by every section on every page.
 */
export default function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 32,
}: AnimatedSectionProps) {
  const offsets = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  }
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, filter: "blur(10px)", ...offsets[direction] }}
      whileInView={{ opacity: 1, filter: "blur(0px)", x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
