import { useRef, type ReactNode } from "react"
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion"
import { cn } from "../../lib/utils"

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Max 3D tilt on hover in degrees. */
  maxTilt?: number
  /** Use the stronger glass recipe. */
  strong?: boolean
  onClick?: () => void
}

/**
 * Signature glass card: frosted blur, inner top highlight, magnetic 3D tilt
 * and a light glare that follows the cursor. The workhorse of the design.
 */
export default function GlassCard({ children, className, maxTilt = 0, strong = false, onClick }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), { stiffness: 160, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), { stiffness: 160, damping: 20 })

  const glareX = useTransform(px, [0, 1], ["-20%", "120%"])
  const glareY = useTransform(py, [0, 1], ["-20%", "120%"])
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(125, 211, 252, 0.16), rgba(255, 255, 255, 0.04) 42%, transparent 62%)`
  const glow = useMotionTemplate`0 18px 48px rgba(2, 8, 24, 0.45), 0 0 44px rgba(56, 189, 248, 0.1)`

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (maxTilt === 0) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }

  return (
    <div style={{ perspective: maxTilt ? 1100 : undefined }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={() => {
          px.set(0.5)
          py.set(0.5)
        }}
        onClick={onClick}
        style={{ rotateX, rotateY, boxShadow: maxTilt ? glow : undefined, transformStyle: "preserve-3d" }}
        className={cn(strong ? "glass-strong" : "glass", "relative overflow-hidden rounded-2xl", className)}
      >
        {children}
        {maxTilt > 0 && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: glare }}
          />
        )}
      </motion.div>
    </div>
  )
}
