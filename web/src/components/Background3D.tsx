'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticlesProps {
  count: number
  aqiLevel: number
}

function Particles({ count, aqiLevel }: ParticlesProps) {
  const mesh = useRef<THREE.Points>(null)
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return positions
  }, [count])

  const color = useMemo(() => {
    if (aqiLevel <= 50) return new THREE.Color('#00e400')
    if (aqiLevel <= 100) return new THREE.Color('#ffff00')
    if (aqiLevel <= 150) return new THREE.Color('#ff7e00')
    if (aqiLevel <= 200) return new THREE.Color('#ff0000')
    if (aqiLevel <= 300) return new THREE.Color('#8f3f97')
    return new THREE.Color('#7e0023')
  }, [aqiLevel])

  useFrame((state) => {
    if (!mesh.current) return
    mesh.current.rotation.x = state.clock.getElapsedTime() * 0.05
    mesh.current.rotation.y = state.clock.getElapsedTime() * 0.075
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.015} color={color} sizeAttenuation transparent opacity={0.6} />
    </points>
  )
}

function FloatingShapes({ aqiLevel }: { aqiLevel: number }) {
  const mesh1 = useRef<THREE.Mesh>(null)
  const mesh2 = useRef<THREE.Mesh>(null)
  const mesh3 = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

    if (mesh1.current) {
      mesh1.current.position.y = Math.sin(t * 0.5) * 0.5
      mesh1.current.rotation.x = t * 0.3
      mesh1.current.rotation.y = t * 0.2
    }

    if (mesh2.current) {
      mesh2.current.position.y = Math.cos(t * 0.7) * 0.3
      mesh2.current.rotation.x = -t * 0.4
      mesh2.current.rotation.z = t * 0.3
    }

    if (mesh3.current) {
      mesh3.current.position.y = Math.sin(t * 0.6) * 0.4
      mesh3.current.rotation.y = t * 0.5
    }
  })

  const getColor = () => {
    if (aqiLevel <= 50) return '#00e400'
    if (aqiLevel <= 100) return '#ffff00'
    if (aqiLevel <= 150) return '#ff7e00'
    if (aqiLevel <= 200) return '#ff0000'
    if (aqiLevel <= 300) return '#8f3f97'
    return '#7e0023'
  }

  return (
    <group>
      <mesh ref={mesh1} position={[-2, 0, -3]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={getColor()} wireframe opacity={0.3} transparent />
      </mesh>

      <mesh ref={mesh2} position={[2, 0, -2]}>
        <icosahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color={getColor()} wireframe opacity={0.3} transparent />
      </mesh>

      <mesh ref={mesh3} position={[0, 0, -4]}>
        <torusGeometry args={[0.3, 0.1, 16, 100]} />
        <meshStandardMaterial color={getColor()} wireframe opacity={0.3} transparent />
      </mesh>
    </group>
  )
}

interface Background3DProps {
  aqiLevel?: number
}

export function Background3D({ aqiLevel = 50 }: Background3DProps) {
  return (
    <div className="fixed inset-0 -z-10 opacity-30">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <Particles count={200} aqiLevel={aqiLevel} />
        <FloatingShapes aqiLevel={aqiLevel} />
      </Canvas>
    </div>
  )
}
