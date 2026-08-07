import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import type { MotionValue } from "framer-motion"
import * as THREE from "three"
import Aircraft3D from "./Aircraft3D"
import CloudParticles from "./CloudParticles"
import { cn } from "../../lib/utils"

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/**
 * The aircraft's journey through the homepage.
 * Columns: [progress, x, y, z, roll(bank), pitch, yaw, scale, trail]
 * x/y/z in world units; the plane is at z≈0 during the hero and retreats to
 * z=-10 (far horizon) by the end of the page. Off-screen holds happen at
 * |x| > 6.5 or z < -8 so the "return" is never visible.
 */
const PATH: number[][] = [
  // p     x      y      z      roll    pitch   yaw     scale  trail
  [0.0, 0.85, 0.55, 0.35, -0.08, 0.06, 0.12, 1.15, 0.0], // hero: cruising right
  [0.06, 1.1, 0.7, 0.3, 0.12, -0.16, 0.18, 1.2, 0.15], // starts to climb
  [0.12, 1.9, 1.15, -0.6, 0.5, -0.32, 0.3, 1.05, 0.5], // banking away
  [0.18, 3.4, 1.75, -3.2, 0.62, -0.45, 0.4, 0.85, 0.8], // climbing hard
  [0.22, 5.4, 2.3, -6.5, 0.55, -0.4, 0.45, 0.7, 1.0], // into the distance
  [0.28, 6.8, 2.6, -9.5, 0.4, -0.3, 0.4, 0.6, 1.0], // gone right
  // hold off-screen, return low from the left
  [0.36, -6.8, -2.2, -8.5, -0.5, 0.25, 0.3, 0.65, 1.0],
  [0.4, -4.4, -1.1, -3.5, -0.35, 0.18, 0.25, 0.8, 0.9],
  [0.46, -1.6, 0.15, 0.1, 0.05, -0.05, 0.15, 1.05, 0.7], // swoops across the map section
  [0.52, 0.9, 0.85, 0.55, 0.45, -0.3, 0.25, 1.15, 0.55], // climbs again mid-screen
  [0.56, 2.6, 1.5, -1.6, 0.6, -0.38, 0.35, 0.9, 0.8],
  [0.62, 5.2, 2.1, -6.0, 0.5, -0.35, 0.4, 0.72, 1.0], // exits right
  [0.68, 6.8, 2.5, -9.5, 0.35, -0.25, 0.35, 0.6, 1.0],
  // hold off-screen, sweep in for the finale
  [0.76, -6.8, -1.9, -8.0, -0.45, 0.2, 0.25, 0.65, 1.0],
  [0.8, -4.2, -0.9, -3.0, -0.3, 0.12, 0.2, 0.82, 0.9],
  [0.85, -1.2, 0.3, 0.2, 0.0, -0.02, 0.12, 1.05, 0.75], // big crossing — trails moment
  [0.9, 1.6, 0.95, -0.8, 0.4, -0.22, 0.2, 0.95, 0.9],
  [0.95, 4.0, 1.6, -4.5, 0.5, -0.3, 0.3, 0.75, 1.0], // toward the horizon
  [1.0, 6.6, 2.2, -10.5, 0.35, -0.25, 0.3, 0.6, 1.0], // fade into the night
]

function sampleKeys(keys: number[][], p: number): number[] {
  if (p <= keys[0][0]) return keys[0].slice(1)
  const last = keys[keys.length - 1]
  if (p >= last[0]) return last.slice(1)
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const a = keys[i - 1]
      const b = keys[i]
      const t = (p - a[0]) / (b[0] - a[0])
      const e = t * t * (3 - 2 * t)
      return a.slice(1).map((v, j) => v + (b[j + 1] - v) * e)
    }
  }
  return last.slice(1)
}

function makeSoftTexture(colorTop: string, colorMid: string): THREE.Texture {
  const c = document.createElement("canvas")
  c.width = c.height = 128
  const ctx = c.getContext("2d")
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, colorTop)
    g.addColorStop(0.45, colorMid)
    g.addColorStop(1, "rgba(120,150,220,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  }
  return new THREE.CanvasTexture(c)
}

function Sun() {
  const halo = useMemo(() => makeSoftTexture("rgba(255,244,214,0.8)", "rgba(255,214,140,0.25)"), [])
  return (
    <>
      <mesh position={[5.5, 4.2, -7]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#fff6d8" />
      </mesh>
      <sprite position={[5.5, 4.2, -7]} scale={[7, 7, 1]}>
        <spriteMaterial map={halo} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  )
}

function Stars() {
  const geometry = useMemo(() => {
    const N = 320
    const positions = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 26 + Math.random() * 12
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.4
      positions[i * 3 + 1] = r * Math.cos(phi) * 1.2 + 2
      positions[i * 3 + 2] = -r * Math.sin(phi) * Math.sin(theta) - 8
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])
  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.05} sizeAttenuation transparent opacity={0.55} color="#dbeafe" depthWrite={false} />
    </points>
  )
}

function JourneyScene({ progress, scrollRef }: { progress: MotionValue<number>; scrollRef: MutableRefObject<number> }) {
  const plane = useRef<THREE.Group | null>(null)
  const trailRef = useRef(0)
  const wobblePhase = useRef(0)

  useFrame((state, dt) => {
    const p = progress.get()
    scrollRef.current = p
    const [x, y, z, roll, pitch, yaw, scale, trail] = sampleKeys(PATH, p)

    // Gentle idle motion at the hero; fades out once the journey begins.
    wobblePhase.current += dt * 1.1
    const idle = Math.max(0, 1 - p * 9)
    const bob = Math.sin(wobblePhase.current) * 0.07 * idle
    const wag = Math.sin(wobblePhase.current * 0.7) * 0.1 * idle

    trailRef.current = THREE.MathUtils.damp(trailRef.current, trail, 2.4, dt)

    const g = plane.current
    if (g) {
      g.position.set(x, y + bob, z)
      g.rotation.set(roll + wag, yaw, pitch)
      g.scale.setScalar(scale)
    }

    // Camera parallax — a slow push toward the aircraft, never hard cuts.
    const cam = state.camera
    const tx = THREE.MathUtils.clamp(x * 0.1, -0.5, 0.5)
    const ty = 0.4 + THREE.MathUtils.clamp(y * 0.08, -0.25, 0.35)
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 2, dt)
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 2, dt)
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 8 - z * 0.06, 2, dt)
    cam.lookAt(x * 0.55, y * 0.6 + 0.2, 0)
  })

  return (
    <>
      <ambientLight intensity={0.5} color="#94a3b8" />
      <directionalLight position={[6, 7, -4]} intensity={2.4} color="#fff3d6" />
      <pointLight position={[-5, 1, 4]} intensity={30} distance={20} color="#38bdf8" />

      <Sun />
      <Stars />
      <CloudParticles scrollRef={scrollRef} />

      <group ref={plane}>
        <Aircraft3D trailRef={trailRef} />
      </group>
    </>
  )
}

interface SkyFlightProps {
  /** Window scroll progress (0..1) driving the aircraft journey. */
  progress: MotionValue<number>
  className?: string
}

/**
 * Fixed full-screen cinematic night-sky scene. The aircraft takes off from
 * the hero and flies through the ENTIRE page as the user scrolls — banking,
 * climbing, turning and leaving contrails — with camera parallax and a cloud
 * field that accelerates with scroll velocity.
 */
export default function SkyFlight({ progress, className }: SkyFlightProps) {
  const scrollRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(true)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = containerRef.current
    if (!el || reduced) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "200px" })
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  return (
    <div ref={containerRef} aria-hidden className={cn("pointer-events-none fixed inset-0 z-0", className)}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={reduced || !visible ? "never" : "always"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 8], fov: 42 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <JourneyScene progress={progress} scrollRef={scrollRef} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.55} intensity={0.65} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.78} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
