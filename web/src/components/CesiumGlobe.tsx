'use client'

import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

interface AQIDataPoint {
  lat: number
  lon: number
  aqi: number
}

interface CesiumGlobeProps {
  aqiData?: AQIDataPoint[]
  selectedLocation?: { lat: number; lon: number } | null
  onLocationSelect?: (lat: number, lon: number) => void
  currentAQI?: number
  onRecenterToCurrentLocation?: () => void
}

function getAQIColor(aqi: number): Cesium.Color {
  if (aqi <= 50) return Cesium.Color.fromCssColorString('#00e400')      // Good - Green
  if (aqi <= 100) return Cesium.Color.fromCssColorString('#ffff00')     // Moderate - Yellow
  if (aqi <= 150) return Cesium.Color.fromCssColorString('#ff7e00')     // Unhealthy for Sensitive - Orange
  if (aqi <= 200) return Cesium.Color.fromCssColorString('#ff0000')     // Unhealthy - Red
  if (aqi <= 300) return Cesium.Color.fromCssColorString('#8f3f97')     // Very Unhealthy - Purple
  return Cesium.Color.fromCssColorString('#7e0023')                      // Hazardous - Maroon
}

export function CesiumGlobe({ aqiData, selectedLocation, onLocationSelect, currentAQI, onRecenterToCurrentLocation }: CesiumGlobeProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const previousLocationRef = useRef<{ lat: number; lon: number } | null>(null)
  const onLocationSelectRef = useRef(onLocationSelect)

  // Keep ref updated
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect
  }, [onLocationSelect])

  useEffect(() => {
    if (!cesiumContainer.current) return

    // Configure Cesium base paths
    if (typeof window !== 'undefined') {
      (window as any).CESIUM_BASE_URL = '/cesium/'
    }

    // Set Cesium Ion access token from environment variable
    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || ''

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      animation: false,
      timeline: false,
      sceneModePicker: true,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: true,
      navigationHelpButton: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: true,
      selectionIndicator: true,
      shadows: false,
      shouldAnimate: false,
    })

    viewerRef.current = viewer

    // Set terrain provider asynchronously
    Cesium.createWorldTerrainAsync().then((terrainProvider) => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.terrainProvider = terrainProvider
      }
    }).catch((error) => {
      console.warn('Failed to load terrain:', error)
    })

    // Add imagery layer with labels
    Cesium.createWorldImageryAsync({
      style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
    }).then((imageryProvider) => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.imageryLayers.removeAll()
        viewerRef.current.imageryLayers.addImageryProvider(imageryProvider)
      }
    }).catch((error) => {
      console.warn('Failed to load imagery:', error)
    })

    // Enable lighting
    viewer.scene.globe.enableLighting = true

    // Set initial camera position
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
    })

    // Add click handler to get location coordinates
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((click: any) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid)
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        const longitude = Cesium.Math.toDegrees(cartographic.longitude)
        const latitude = Cesium.Math.toDegrees(cartographic.latitude)

        if (onLocationSelectRef.current) {
          onLocationSelectRef.current(latitude, longitude)
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // Cleanup
    return () => {
      if (handler) {
        handler.destroy()
      }
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, []) // Empty deps - only run once on mount

  // Update AQI data points
  useEffect(() => {
    if (!viewerRef.current || !aqiData) return

    const viewer = viewerRef.current

    // Clear existing entities
    viewer.entities.removeAll()

    // Add AQI markers
    const pinBuilder = new Cesium.PinBuilder()

    aqiData.forEach((point) => {
      const color = getAQIColor(point.aqi)

      viewer.entities.add({
        name: `AQI: ${point.aqi}`,
        position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
        billboard: {
          image: pinBuilder.fromColor(color, 48).toDataURL(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
        description: `<div style="padding: 10px;">
          <h3>Air Quality Index</h3>
          <p><strong>AQI:</strong> ${point.aqi}</p>
          <p><strong>Location:</strong> ${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}</p>
        </div>`,
      })
    })
  }, [aqiData])

  // Update selected location marker (updates when AQI changes)
  useEffect(() => {
    if (!viewerRef.current || !selectedLocation) return

    const viewer = viewerRef.current

    // Remove previous selection marker if exists
    const existingMarker = viewer.entities.getById('selected-location')
    if (existingMarker) {
      viewer.entities.remove(existingMarker)
    }

    // Add new selection marker with AQI color if available, otherwise red
    const pinBuilder = new Cesium.PinBuilder()
    const markerColor = currentAQI ? getAQIColor(currentAQI) : Cesium.Color.RED

    viewer.entities.add({
      id: 'selected-location',
      name: currentAQI ? `Selected Location (AQI: ${currentAQI})` : 'Selected Location',
      position: Cesium.Cartesian3.fromDegrees(selectedLocation.lon, selectedLocation.lat),
      billboard: {
        image: pinBuilder.fromColor(markerColor, 40).toDataURL(),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      description: currentAQI ? `<div style="padding: 10px;">
        <h3>Selected Location</h3>
        <p><strong>AQI:</strong> ${currentAQI}</p>
        <p><strong>Coordinates:</strong> ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lon.toFixed(4)}</p>
      </div>` : undefined,
    })
  }, [selectedLocation, currentAQI])

  // Handle camera movement (only when location changes)
  useEffect(() => {
    if (!viewerRef.current || !selectedLocation) return

    const viewer = viewerRef.current

    // Check if this is a NEW location
    const isNewLocation = !previousLocationRef.current ||
      previousLocationRef.current.lat !== selectedLocation.lat ||
      previousLocationRef.current.lon !== selectedLocation.lon

    // Fly to location only when the location actually changes
    if (isNewLocation) {
      console.log('Flying to:', selectedLocation.lat, selectedLocation.lon)

      // Get current camera height to preserve zoom level
      const currentHeight = viewer.camera.positionCartographic.height
      // Use current height if reasonable, otherwise use default
      const targetHeight = (currentHeight > 1000000 && currentHeight < 20000000) ? currentHeight : 5000000

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          selectedLocation.lon,
          selectedLocation.lat,
          targetHeight
        ),
        duration: 2,
      })

      previousLocationRef.current = { lat: selectedLocation.lat, lon: selectedLocation.lon }
    }
  }, [selectedLocation])

  // Wire home button to recenter to current location
  useEffect(() => {
    if (!viewerRef.current || !onRecenterToCurrentLocation) return

    const viewer = viewerRef.current

    const homeButtonClickHandler = viewer.homeButton.viewModel.command.beforeExecute.addEventListener((e: any) => {
      e.cancel = true
      onRecenterToCurrentLocation()
    })

    return () => {
      // Cleanup listener on unmount
      if (homeButtonClickHandler) {
        homeButtonClickHandler()
      }
    }
  }, [onRecenterToCurrentLocation])

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-3xl overflow-hidden relative">
      <div ref={cesiumContainer} className="w-full h-full" />

      {/* Legend - moved to top-left to avoid Cesium logo */}
      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl p-4 text-white z-10">
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
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8f3f97' }} />
            <span>Very Unhealthy (201-300)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7e0023' }} />
            <span>Hazardous (300+)</span>
          </div>
        </div>
      </div>

      {/* Controls hint - moved to bottom right */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl p-3 text-white text-xs z-10">
        <p>🖱️ Left drag to rotate</p>
        <p>🖱️ Right drag to pan</p>
        <p>🔍 Scroll to zoom</p>
        <p>🏠 Home button to reset</p>
      </div>
    </div>
  )
}
