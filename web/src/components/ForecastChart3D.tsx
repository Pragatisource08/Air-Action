'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

interface ForecastData {
  hour: number
  timestamp: string
  aqi: number
  category: string
}

interface ForecastChart3DProps {
  data: ForecastData[]
  height?: number
}

function Bar({ position, height, color, label, aqiValue }: { position: [number, number, number]; height: number; color: string; label: string; aqiValue: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (mesh.current) {
      const targetScale = hovered ? 1.1 : 1
      mesh.current.scale.x += (targetScale - mesh.current.scale.x) * 0.1
      mesh.current.scale.z += (targetScale - mesh.current.scale.z) * 0.1
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={mesh}
        position={[0, height / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.4, height, 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.2} />
      </mesh>
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {hovered && (
        <Text
          position={[0, height + 0.3, 0]}
          fontSize={0.2}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          AQI: {aqiValue}
        </Text>
      )}
    </group>
  )
}

function CameraController() {
  const controlsRef = useRef<any>(null)

  useFrame(() => {
    if (controlsRef.current) {
      const target = controlsRef.current.target
      const defaultTarget = new THREE.Vector3(0, 0, 0)

      // Smoothly return to default position if user hasn't interacted recently
      if (target.distanceTo(defaultTarget) > 0.01) {
        target.lerp(defaultTarget, 0.02)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2}
      minAzimuthAngle={-Math.PI / 3}  // Limit left rotation to 60 degrees
      maxAzimuthAngle={Math.PI / 3}   // Limit right rotation to 60 degrees
      minDistance={3}
      maxDistance={8}
      autoRotate={false}
    />
  )
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00e400'
  if (aqi <= 100) return '#ffff00'
  if (aqi <= 150) return '#ff7e00'
  if (aqi <= 200) return '#ff0000'
  if (aqi <= 300) return '#8f3f97'
  return '#7e0023'
}

function formatTimeLabel(timestamp: string, hour: number): string {
  try {
    const date = new Date(timestamp)
    const hours = date.getHours()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}${ampm}`
  } catch {
    // Fallback to hour number if timestamp parsing fails
    const displayHours = hour % 12 || 12
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${displayHours}${ampm}`
  }
}

export function ForecastChart3D({ data, height = 400 }: ForecastChart3DProps) {
  const displayData = data.slice(0, 12) // Show first 12 hours

  return (
    <div style={{ height: `${height}px` }} className="w-full bg-gray-900/50 rounded-3xl overflow-hidden relative">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {displayData.map((point, index) => {
          const xPos = (index - displayData.length / 2) * 0.6
          const barHeight = (point.aqi / 300) * 3 // Max height of 3 units
          const color = getAQIColor(point.aqi)
          const label = formatTimeLabel(point.timestamp, point.hour)

          return (
            <Bar
              key={index}
              position={[xPos, 0, 0]}
              height={barHeight}
              color={color}
              label={label}
              aqiValue={point.aqi}
            />
          )
        })}

        <gridHelper args={[10, 10, '#444', '#222']} position={[0, 0, 0]} />

        <CameraController />
      </Canvas>

      {/* Controls hint */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-white text-xs">
        <p>🖱️ Drag to rotate</p>
        <p>🔍 Scroll to zoom</p>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-white text-xs">
        <p className="font-bold mb-2">AQI Levels</p>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00e400' }} />
            <span>Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ffff00' }} />
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ff7e00' }} />
            <span>Unhealthy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
