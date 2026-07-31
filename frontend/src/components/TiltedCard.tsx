import { useRef, type ReactNode } from "react"
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion"

interface TiltedCardProps {
  children: ReactNode
  className?: string
  /** Max tilt in degrees */
  maxTilt?: number
}

/** 3D tilt-on-hover glass card with a moving light reflection. */
export default function TiltedCard({ children, className = "", maxTilt = 10 }: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), { stiffness: 150, damping: 18 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), { stiffness: 150, damping: 18 })

  const glareX = useTransform(px, [0, 1], ["0%", "100%"])
  const glareY = useTransform(py, [0, 1], ["0%", "100%"])
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(125, 211, 252, 0.22), rgba(255, 255, 255, 0.06) 45%, transparent 60%)`
  const glowShadow = useMotionTemplate`0 0 32px rgba(56, 189, 248, 0.22)`

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((e.clientX - rect.left) / rect.width)
    py.set((e.clientY - rect.top) / rect.height)
  }

  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, boxShadow: glowShadow, transformStyle: "preserve-3d" }}
        className={`glass rounded-2xl ${className}`}
      >
        <div style={{ transform: "translateZ(30px)" }} className="relative h-full">
          {children}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ background: glareBackground }}
          />
        </div>
      </motion.div>
    </div>
  )
}
