import { useMemo } from "react"
import { cn } from "../../lib/utils"

interface CloudLayerProps {
  className?: string
  /** Density of cloud banks (2–6). */
  density?: number
  /** 0–1, cloud opacity multiplier. */
  intensity?: number
}

/**
 * DOM cloud banks drifting slowly across a section — cheap, reliable,
 * GPU-cheap (only transform + blur). Used inside sections as a second
 * layer above video/aurora backgrounds.
 */
export default function CloudLayer({ className, density = 4, intensity = 1 }: CloudLayerProps) {
  const clouds = useMemo(
    () =>
      Array.from({ length: density }).map((_, i) => {
        const seed = (i * 7919) % 9973
        const top = 6 + ((seed * 37) % 74) // 6% – 80%
        const scale = 0.55 + ((seed * 13) % 100) / 150 // 0.55 – 1.2
        const duration = 55 + ((seed * 7) % 60) // 55s – 115s
        const delay = -((seed * 3) % 100) // stagger the drift loop
        const opacity = (0.25 + ((seed * 11) % 40) / 100) * intensity
        return { top, scale, duration, delay, opacity }
      }),
    [density, intensity]
  )

  return (
    <div aria-hidden className={cn("cloud-layer", className)}>
      {clouds.map((c, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: `${c.top}%`,
            width: `${42 * c.scale}vw`,
            height: `${11 * c.scale}vh`,
            opacity: c.opacity,
            animation: `cloud-drift ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
