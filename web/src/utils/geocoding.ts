
interface GeocodeResult {
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  country?: string
  display_name?: string
}

interface GeocodeResponse {
  address?: GeocodeResult
  display_name?: string
}

const cache = new Map<string, string>()

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`

  if (cache.has(key)) {
    return cache.get(key)!
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Air Quality App'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data: GeocodeResponse = await response.json()

    if (data.address) {
      const parts: string[] = []

      if (data.address.city) {
        parts.push(data.address.city)
      } else if (data.address.town) {
        parts.push(data.address.town)
      } else if (data.address.village) {
        parts.push(data.address.village)
      }

      if (data.address.state && data.address.country) {
        parts.push(`${data.address.state}, ${data.address.country}`)
      } else if (data.address.country) {
        parts.push(data.address.country)
      }

      const locationName = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`

      cache.set(key, locationName)
      return locationName
    }
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
  }

  const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  cache.set(key, fallback)
  return fallback
}

if (typeof window !== 'undefined') {
  setInterval(() => {
    if (cache.size > 100) {
      cache.clear()
    }
  }, 300000)
}