import { useEffect, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

/** Decorative glass ring that follows the cursor on fine-pointer (desktop) devices. */
export default function CursorRing() {
  const [enabled, setEnabled] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const springX = useSpring(x, { stiffness: 400, damping: 35, mass: 0.6 })
  const springY = useSpring(y, { stiffness: 400, damping: 35, mass: 0.6 })

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    setEnabled(true)
    const move = (e: MouseEvent) => {
      x.set(e.clientX - 16)
      y.set(e.clientY - 16)
    }
    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)
  }, [x, y])

  if (!enabled) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-8 w-8 rounded-full border border-sky-400/40 bg-sky-400/[0.06] shadow-[0_0_24px_rgba(56,189,248,0.25)]"
      style={{ x: springX, y: springY }}
    />
  )
}
