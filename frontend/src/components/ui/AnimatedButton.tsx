import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

type Variant = "primary" | "ghost" | "outline" | "glass"
type Size = "sm" | "md" | "lg"

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-400/40 hover:from-sky-400 hover:to-blue-500",
  outline: "border border-white/15 text-foreground hover:border-sky-400/50 hover:text-sky-300 bg-white/[0.02]",
  glass: "glass text-foreground hover:border-sky-400/40 hover:text-sky-200",
  ghost: "text-muted-foreground hover:text-sky-300",
}

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-2xl gap-2.5",
}

interface AnimatedButtonProps {
  to?: string
  variant?: Variant
  size?: Size
  /** Sweeping shine across the button every few seconds. */
  shine?: boolean
  className?: string
  children: ReactNode
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  onClick?: () => void
  "aria-label"?: string
}

const baseCls =
  "btn-shine relative inline-flex cursor-pointer items-center justify-center font-semibold transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030610]"

/**
 * Premium button: micro hover lift, springy press, optional periodic shine
 * sweep. Pass `to` to render an internal router link instead of a button.
 */
export default function AnimatedButton({
  to,
  variant = "primary",
  size = "md",
  shine = false,
  className,
  children,
  type = "button",
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: AnimatedButtonProps) {
  const cls = cn(baseCls, variants[variant], sizes[size], className)

  const inner = (
    <>
      {children}
      {shine && <span aria-hidden className="btn-shine" />}
    </>
  )

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.96, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn("inline-block", disabled && "pointer-events-none opacity-50")}
    >
      {to ? (
        <Link to={to} className={cls} aria-label={ariaLabel}>
          {inner}
        </Link>
      ) : (
        <button type={type} className={cls} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>
          {inner}
        </button>
      )}
    </motion.div>
  )
}
