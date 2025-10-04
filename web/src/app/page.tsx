'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HealthAdviceCard } from '@/components/HealthAdviceCard'
import { AqiBadge } from '@/components/AqiBadge'
import { LocationSearch } from '@/components/LocationSearch'
import { MaximizedMapOverlay } from '@/components/MaximizedMapOverlay'
import { AqiReferenceTable } from '@/components/AqiReferenceTable'
import { InfoTooltip } from '@/components/InfoTooltip'
import { DataSourceIndicator } from '@/components/DataSourceIndicator'
import { DateSelector } from '@/components/DateSelector'
import { DateIndicator } from '@/components/DateIndicator'
import { formatWithTimezone, getTimezoneDisplay, getTodayInLocalTimezone } from '@/utils/timezone'
import { MapSkeleton, ForecastChartSkeleton, HealthAdviceSkeleton } from '@/components/LoadingSkeleton'
import { NetworkError } from '@/components/ErrorBoundary'

const OpenStreetMap = dynamic(() => import('@/components/OpenStreetMap').then(mod => ({ default: mod.OpenStreetMap })), {
  ssr: false,
  loading: () => <MapSkeleton />
})

const CesiumGlobe = dynamic(() => import('@/components/CesiumGlobe').then(mod => ({ default: mod.CesiumGlobe })), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-gray-900 rounded-3xl animate-pulse" />
})

const Background3D = dynamic(() => import('@/components/Background3D').then(mod => mod.Background3D), {
  ssr: false
})

const ForecastChart3D = dynamic(() => import('@/components/ForecastChart3D').then(mod => mod.ForecastChart3D), {
  ssr: false,
  loading: () => <ForecastChartSkeleton />
})

interface ForecastData {
  hour: number
  timestamp: string
  aqi: number
  aqi_lower: number
  aqi_upper: number
  pm25: number
  category: string
}

interface ForecastResponse {
  lat: number
  lon: number
  forecast: ForecastData[]
  model: string
  generated_at: string
  target_date?: string
  is_historical?: boolean
  is_future?: boolean
  data_sources?: {
    satellite: boolean
    ground_sensors: boolean
    weather: boolean
  }
  data_quality?: string
  real_time_data?: any
}

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number} | null>(null)
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMapMaximized, setIsMapMaximized] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [geolocationError, setGeolocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [mapType, setMapType] = useState<'terrain' | 'satellite' | 'roadmap'>('satellite')
  const [showAQIOverlay, setShowAQIOverlay] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [enable3DEffects, setEnable3DEffects] = useState(true)

  const handleLocationSelect = async (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon })
    await fetchForecastData(lat, lon)
  }

  const fetchForecastData = async (lat: number, lon: number, date?: string, retryCount = 0) => {
    const targetDate = date || selectedDate
    setLoading(true)
    setError(null)
    setForecastData(null)

    try {
      await updateLocationName(lat, lon)

      const dateString = targetDate

      // Use Next.js API route proxy instead of calling backend directly
      let url = `/api/forecast?lat=${lat}&lon=${lon}&horizon=24`

      const today = new Date()
      const targetDateObj = new Date(targetDate)
      const isToday = targetDateObj.toDateString() === today.toDateString()
      if (!isToday) {
        url += `&target_date=${dateString}`
      }

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch forecast data')
      }

      const data: ForecastResponse = await response.json()
      setForecastData(data)
    } catch (err) {
      // Retry logic: attempt up to 2 retries with exponential backoff
      if (retryCount < 2) {
        console.log(`Retrying fetch... (attempt ${retryCount + 1}/2)`)
        setTimeout(() => {
          fetchForecastData(lat, lon, date, retryCount + 1)
        }, 1000 * Math.pow(2, retryCount)) // 1s, 2s backoff
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to fetch forecast')
      console.error('Forecast fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    if (selectedLocation) {
      fetchForecastData(selectedLocation.lat, selectedLocation.lon, date)
    }
  }

  const updateLocationName = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.display_name) {
          setSelectedAddress(data.display_name)
        }
      }
    } catch (error) {
      console.error('Failed to get location name:', error)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeolocationError('Geolocation is not supported by this browser')
      return
    }

    setIsLoadingLocation(true)
    setGeolocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        handleLocationSelect(latitude, longitude)
        setIsLoadingLocation(false)
      },
      (error) => {
        let errorMessage = 'Failed to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setGeolocationError(errorMessage)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  useEffect(() => {
    // Set today's date in user's local timezone
    setSelectedDate(getTodayInLocalTimezone())
    getCurrentLocation()
  }, [])

  const handleSearchLocationSelect = (lat: number, lon: number, address: string) => {
    setSelectedAddress(address)
    handleLocationSelect(lat, lon)
  }

  const handleToggleMapMaximize = () => {
    setIsMapMaximized(!isMapMaximized)
  }


  const currentAqi = forecastData?.forecast[0]?.aqi || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-black dark:via-gray-900 dark:to-gray-800 transition-all duration-500 relative">
      {enable3DEffects && <Background3D aqiLevel={currentAqi} />}

      <header className="backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-white/20 dark:border-gray-600/50 sticky top-0 z-50">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">AQ</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  AirQuality
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">From EarthData to Action • Times in {getTimezoneDisplay()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LocationSearch onLocationSelect={handleSearchLocationSelect} />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6 animate-fade-in">
            <div className="backdrop-blur-sm bg-white/70 dark:bg-black/70 rounded-3xl p-6 border border-white/20 dark:border-gray-600/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{viewMode === '2d' ? '🗺️' : '🌍'}</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Select Location
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation}
                    className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                    title="Use my current location"
                  >
                    {isLoadingLocation ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span>{viewMode === '2d' ? '🌍 3D Globe' : '🗺️ 2D Map'}</span>
                  </button>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                  {viewMode === '2d' ? (
                    <motion.div
                      key="2d-map"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <OpenStreetMap
                        onLocationSelect={handleLocationSelect}
                        selectedLocation={selectedLocation}
                        height="500px"
                        isMaximized={isMapMaximized}
                        onToggleMaximize={handleToggleMapMaximize}
                        mapType={mapType}
                        onMapTypeChange={setMapType}
                        showAQIOverlay={showAQIOverlay}
                        onToggleAQIOverlay={() => setShowAQIOverlay(!showAQIOverlay)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="3d-globe"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CesiumGlobe
                        selectedLocation={selectedLocation}
                        onLocationSelect={handleLocationSelect}
                        currentAQI={forecastData?.forecast[0]?.aqi}
                        onRecenterToCurrentLocation={getCurrentLocation}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {selectedLocation && (
              <div className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 rounded-3xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl animate-slide-up">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-xl">📍</span>
                  <h3 className="font-bold text-gray-900 dark:text-white">Selected Location</h3>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl p-4">
                  {selectedAddress && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-2">
                      {selectedAddress}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
                  </p>
                  {loading && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                      <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
                      <span>Getting fresh forecast data...</span>
                    </div>
                  )}
                  {error && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
                      <span>Error: {error}</span>
                    </div>
                  )}
                  {geolocationError && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-orange-600 dark:text-orange-400">
                      <span>{geolocationError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedLocation && (
              <div className="animate-slide-up">
                <AqiReferenceTable />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <ForecastChartSkeleton />
                  <HealthAdviceSkeleton />
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <NetworkError
                    onRetry={() => selectedLocation && fetchForecastData(selectedLocation.lat, selectedLocation.lon)}
                  />
                </motion.div>
              )}

              {forecastData && !loading && !error && (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <>
                <div className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 rounded-3xl p-4 border border-white/20 dark:border-gray-700/50 shadow-xl animate-slide-up">
                  <div className="flex items-center justify-between">
                    <DateIndicator selectedDate={selectedDate} />
                    <DateSelector
                      selectedDate={selectedDate}
                      onDateChange={handleDateChange}
                    />
                  </div>
                </div>

                <div className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 rounded-3xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl animate-slide-up">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {forecastData.is_historical ? 'Historical Data' : forecastData.is_future ? 'Future Forecast' : 'Current Forecast'}
                      </h2>
                    </div>
                    <AqiBadge aqi={currentAqi} size="lg" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-4">
                      <div className="flex items-center">
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">PM2.5</p>
                        <InfoTooltip text="PM2.5 are fine particulate matter with diameter ≤2.5 micrometers. These tiny particles can penetrate deep into lungs and bloodstream, causing respiratory and cardiovascular health issues. WHO guideline: 15 μg/m³ annual average." />
                      </div>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                        {forecastData.forecast[0]?.pm25?.toFixed(1)} 
                        <span className="text-sm font-normal ml-1">μg/m³</span>
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-4">
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Category</p>
                      <p className="text-base font-bold text-purple-800 dark:text-purple-300">
                        {forecastData.forecast[0]?.category}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Model: {forecastData.model} | Generated: {formatWithTimezone(forecastData.generated_at)}
                      {forecastData.data_quality && (
                        <span className="ml-2">| Quality: {forecastData.data_quality}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="animate-slide-up">
                  <HealthAdviceCard aqi={currentAqi} />
                </div>

                <div className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 rounded-3xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl animate-slide-up">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">AQI Forecast</h3>
                  <ForecastChart3D
                    data={forecastData.forecast}
                    height={350}
                  />
                </div>

                {forecastData.data_sources && (
                  <div className="animate-slide-up">
                    <DataSourceIndicator 
                      dataSources={forecastData.data_sources}
                      dataQuality={forecastData.data_quality || 'unknown'}
                      model={forecastData.model}
                    />
                  </div>
                )}
              </>
                </motion.div>
            )}


            {!forecastData && !loading && (
              <motion.div
                key="no-data"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 rounded-3xl p-12 border border-white/20 dark:border-gray-700/50 shadow-xl text-center animate-fade-in"
              >
                <div className="text-6xl mb-6 animate-pulse-slow text-blue-500">AQ</div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Ready to Explore?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                  Click anywhere on the map to discover air quality insights and health guidance
                </p>
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-medium">
                  <span>Tap the map to start</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 left-4 right-4 z-40 flex justify-between items-end pointer-events-none">
        <div className="pointer-events-auto">
          <InfoTooltip
            text={
              forecastData?.model?.includes('tempo_openaq')
                ? "Using real-time data integration: NASA TEMPO satellite measurements, OpenAQ ground-based sensors, and weather data for accurate air quality assessments."
                : "Real-time air quality data from NASA TEMPO satellite and OpenAQ ground sensors with EPA health standards."
            }
          />
        </div>

        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 text-sm text-white">
          <span>Made with</span>
          <span className="text-red-500 animate-pulse">♥</span>
          <span>for the planet by Atharv and Pragati</span>
        </div>
      </div>

      <MaximizedMapOverlay
        isOpen={isMapMaximized}
        onClose={() => setIsMapMaximized(false)}
        forecastData={forecastData}
        selectedLocation={selectedLocation}
        loading={loading}
        error={error}
        onLocationRequest={getCurrentLocation}
      >
        <OpenStreetMap
          onLocationSelect={handleLocationSelect}
          selectedLocation={selectedLocation}
          height="100vh"
          isMaximized={true}
          onToggleMaximize={handleToggleMapMaximize}
          mapType={mapType}
          onMapTypeChange={setMapType}
          showAQIOverlay={showAQIOverlay}
          onToggleAQIOverlay={() => setShowAQIOverlay(!showAQIOverlay)}
        />
      </MaximizedMapOverlay>
    </div>
  )
}
