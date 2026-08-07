import { useRef, type MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface Aircraft3DProps {
  /** Ref holding 0..1 — contrail intensity (animated externally). */
  trailRef: MutableRefObject<number>
  /** Engine fan spin speed (rad/s). */
  fanSpeed?: number
}

/**
 * Stylized narrow-body airliner built entirely from primitives — no GLTF,
 * no network assets, consistent with the night-aurora design language.
 *
 * Model convention: nose points along +X, so on the outer group
 * `rotation.x` = bank, `rotation.y` = heading, `rotation.z` = pitch
 * (positive = nose up), Euler order XYZ.
 */
export default function Aircraft3D({ trailRef, fanSpeed = 10 }: Aircraft3DProps) {
  const fans = useRef<(THREE.Mesh | null)[]>([])
  const trailL = useRef<THREE.Mesh | null>(null)
  const trailR = useRef<THREE.Mesh | null>(null)

  useFrame((_, dt) => {
    for (const fan of fans.current) {
      if (fan) fan.rotation.z -= dt * fanSpeed
    }
    const t = Math.max(0, Math.min(1, trailRef.current))
    const opacity = t * t * 0.55
    for (const trail of [trailL.current, trailR.current]) {
      if (!trail) continue
      const mat = trail.material as THREE.MeshBasicMaterial
      trail.visible = opacity > 0.02
      mat.opacity = opacity
      trail.scale.y = 0.6 + t * 1.8
    }
  })

  const body = { color: "#e8eef8", metalness: 0.55, roughness: 0.32 }
  const dark = { color: "#141b2e", metalness: 0.7, roughness: 0.4 }

  return (
    <group scale={0.55}>
      {/* ── Contrails (animated) ── */}
      <mesh ref={trailL} position={[-3.4, -0.06, 0.34]} visible={false}>
        <boxGeometry args={[4.6, 0.05, 0.05]} />
        <meshBasicMaterial transparent opacity={0} color="#bcd7ff" />
      </mesh>
      <mesh ref={trailR} position={[-3.4, -0.06, -0.34]} visible={false}>
        <boxGeometry args={[4.6, 0.05, 0.05]} />
        <meshBasicMaterial transparent opacity={0} color="#bcd7ff" />
      </mesh>

      {/* ── Fuselage ── */}
      <mesh rotation={[0, 0, Math.PI / 2]} material-color={body.color} material-metalness={body.metalness} material-roughness={body.roughness}>
        <cylinderGeometry args={[0.3, 0.3, 3.1, 24]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[1.8, 0, 0]} material-color={body.color} material-metalness={body.metalness} material-roughness={body.roughness}>
        <coneGeometry args={[0.3, 0.75, 24]} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 2]} position={[-1.68, 0, 0]} material-color={body.color} material-metalness={body.metalness} material-roughness={body.roughness}>
        <coneGeometry args={[0.28, 0.55, 24]} />
      </mesh>

      {/* Livery stripe */}
      <mesh position={[0, -0.13, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.315, 0.315, 3.0, 24, 1, false, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Cockpit glass */}
      <mesh position={[1.52, 0.06, 0]}>
        <boxGeometry args={[0.36, 0.26, 0.44]} />
        <meshStandardMaterial {...dark} transparent opacity={0.92} />
      </mesh>

      {/* ── Wings ── */}
      <group position={[-0.1, -0.06, 0]} rotation={[0, 0, -0.02]}>
        <mesh position={[0, 0, 0]} material-color={body.color} material-metalness={body.metalness} material-roughness={body.roughness}>
          <boxGeometry args={[3.8, 0.07, 0.85]} />
        </mesh>
        {/* Winglets */}
        <mesh position={[0.15, 0.22, 1.05]} rotation={[0.32, 0, 0]}>
          <boxGeometry args={[0.55, 0.36, 0.05]} />
          <meshStandardMaterial {...body} />
        </mesh>
        <mesh position={[0.15, 0.22, -1.05]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[0.55, 0.36, 0.05]} />
          <meshStandardMaterial {...body} />
        </mesh>
        {/* Nav lights */}
        <mesh position={[-0.35, 0, 1.06]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#22c55e" />
        </mesh>
        <mesh position={[-0.35, 0, -1.06]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* ── Engines + fans ── */}
      {[1.05, -1.05].map((z) => (
        <group key={z} position={[-0.55, -0.24, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.62, 16]} />
            <meshStandardMaterial {...dark} />
          </mesh>
          <mesh position={[0.33, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.17, 0.22, 16]} />
            <meshStandardMaterial color="#8b97ab" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh
            ref={(el) => {
              fans.current[z > 0 ? 0 : 1] = el
            }}
            position={[-0.33, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.11, 12]} />
            <meshBasicMaterial color="#dbe6f5" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ── Tail ── */}
      <group position={[-1.72, 0.02, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.06, 0.62, 0.4]} />
          <meshStandardMaterial {...body} />
        </mesh>
        <mesh position={[0.12, 0.6, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.3, 0.04, 0.3]} />
          <meshStandardMaterial {...body} />
        </mesh>
        <mesh position={[0, -0.03, 0.24]}>
          <boxGeometry args={[1.25, 0.05, 0.06]} />
          <meshStandardMaterial {...body} />
        </mesh>
        <mesh position={[0, -0.03, -0.24]}>
          <boxGeometry args={[1.25, 0.05, 0.06]} />
          <meshStandardMaterial {...body} />
        </mesh>
      </group>
    </group>
  )
}
