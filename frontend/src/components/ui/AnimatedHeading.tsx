import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

interface AnimatedHeadingProps {
  children: ReactNode
  className?: string
  /** Optional gradient span rendered inside the heading. */
  accent?: string
  /** Eyebrow kicker above the heading (uppercase, letter-spaced). */
  kicker?: string
  center?: boolean
}

/**
 * Section heading with a staggered word reveal and an animated gradient
 * accent line — the typographic signature of the site.
 */
export default function AnimatedHeading({ children, className, accent, kicker, center = false }: AnimatedHeadingProps) {
  return (
    <div className={cn(center && "text-center", className)}>
      {kicker && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-grotesk text-xs font-semibold uppercase tracking-[0.3em] text-sky-400"
        >
          {kicker}
        </motion.p>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn("font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl", center && "mx-auto", className)}
      >
        {children}
        {accent && (
          <>
            {" "}
            <span className="text-gradient-sky">{accent}</span>
          </>
        )}
      </motion.h2>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mt-4 block h-0.5 w-16 origin-left rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500",
          center && "mx-auto origin-center"
        )}
      />
    </div>
  )
}
