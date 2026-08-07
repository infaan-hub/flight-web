import { useMemo, useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

/**
 * Soft drifting cloud field (billboard particles) with a speed boost that
 * follows scroll velocity — flying fast past clouds sells the aircraft's
 * motion.
 */
export default function CloudParticles({ scrollRef }: { scrollRef: MutableRefObject<number> }) {
  const pointsRef = useRef<THREE.Points | null>(null)

  const texture = useMemo(() => {
    const c = document.createElement("canvas")
    c.width = c.height = 128
    const ctx = c.getContext("2d")
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, "rgba(196,218,255,1)")
      g.addColorStop(0.35, "rgba(158,186,240,0.5)")
      g.addColorStop(1, "rgba(130,160,225,0)")
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
    }
    return new THREE.CanvasTexture(c)
  }, [])

  const geometry = useMemo(() => {
    const N = 150
    const positions = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13
      positions[i * 3 + 2] = -9 + Math.random() * 11
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const boost = useRef(0)
  const lastP = useRef(0)

  useFrame((state, dt) => {
    const p = scrollRef.current
    const boostTarget = Math.max(0, (p - lastP.current) * 60)
    lastP.current = p
    boost.current = THREE.MathUtils.damp(boost.current, boostTarget + 0.7, 2.2, dt)
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] -= dt * boost.current * (0.6 + arr[i * 3 + 1] * 0.08)
      if (arr[i * 3] < -16) arr[i * 3] = 16
    }
    pos.needsUpdate = true
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.02
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={texture}
        size={0.75}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        color="#a8c4f5"
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
