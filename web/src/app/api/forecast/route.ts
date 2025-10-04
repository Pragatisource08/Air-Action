import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const horizon = searchParams.get('horizon') || '24'
  const targetDate = searchParams.get('target_date')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing lat or lon parameters' },
      { status: 400 }
    )
  }

  try {
    // Build the backend API URL
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    let url = `${backendUrl}/forecast?lat=${lat}&lon=${lon}&horizon=${horizon}`

    if (targetDate) {
      url += `&target_date=${targetDate}`
    }

    // Forward the request to the backend API
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error('Backend API request failed')
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast data' },
      { status: 500 }
    )
  }
}
