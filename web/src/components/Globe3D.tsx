'use client'

import { useRef, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface AQIDataPoint {
  lat: number
  lon: number
  aqi: number
}

interface Globe3DProps {
  aqiData?: AQIDataPoint[]
  selectedLocation?: { lat: number; lon: number } | null
  onLocationSelect?: (lat: number, lon: number) => void
  currentAQI?: number
}

function Earth({ aqiData, selectedLocation }: { aqiData?: AQIDataPoint[], selectedLocation?: { lat: number; lon: number } | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(
      '/textures/earth.jpg',
      (loadedTexture) => {
        setTexture(loadedTexture)
      },
      undefined,
      (error) => {
        console.error('Error loading Earth texture:', error)
      }
    )
  }, [])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001 // Slow rotation
    }
  })

  return (
    <group>
      {/* Earth sphere with real texture */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        {texture ? (
          <meshStandardMaterial
            map={texture}
            roughness={0.7}
            metalness={0.2}
          />
        ) : (
          <meshStandardMaterial
            color="#3b82f6"
            roughness={0.5}
            metalness={0.3}
          />
        )}
      </Sphere>

      {/* AQI data points as particles */}
      {aqiData?.map((point, index) => {
        const phi = (90 - point.lat) * (Math.PI / 180)
        const theta = (point.lon + 180) * (Math.PI / 180)
        const radius = 2.05

        const x = -(radius * Math.sin(phi) * Math.cos(theta))
        const z = radius * Math.sin(phi) * Math.sin(theta)
        const y = radius * Math.cos(phi)

        const color = getAQIColor(point.aqi)

        return (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
            />
          </mesh>
        )
      })}

      {/* Selected location marker */}
      {selectedLocation && (
        <mesh position={latLonToVector3(selectedLocation.lat, selectedLocation.lon, 2.1)}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1}
          />
        </mesh>
      )}
    </group>
  )
}

function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)

  return [x, y, z]
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00e400'      // Good - Green
  if (aqi <= 100) return '#ffff00'     // Moderate - Yellow
  if (aqi <= 150) return '#ff7e00'     // Unhealthy for Sensitive - Orange
  if (aqi <= 200) return '#ff0000'     // Unhealthy - Red
  if (aqi <= 300) return '#8f3f97'     // Very Unhealthy - Purple
  return '#7e0023'                      // Hazardous - Maroon
}

export function Globe3D({ aqiData, selectedLocation, onLocationSelect }: Globe3DProps) {
  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-3xl overflow-hidden relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, -5, -5]} intensity={0.8} />
          <pointLight position={[0, 0, 10]} intensity={1} />

          <Earth aqiData={aqiData} selectedLocation={selectedLocation} />

          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={3}
            maxDistance={8}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-xl p-4 text-white">
        <h3 className="text-sm font-bold mb-2">AQI Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00e400' }} />
            <span>Good (0-50)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ffff00' }} />
            <span>Moderate (51-100)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff7e00' }} />
            <span>Unhealthy for Sensitive (101-150)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff0000' }} />
            <span>Unhealthy (151-200)</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-xl p-3 text-white text-xs">
        <p>🖱️ Drag to rotate</p>
        <p>🔍 Scroll to zoom</p>
      </div>
    </div>
  )
}
