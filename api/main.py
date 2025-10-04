from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, List, Any
import httpx
import asyncio
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import json
from geopy.distance import geodesic
import random
import hashlib

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Air Quality Forecasting API",
    description="Real-time API integrating NASA TEMPO satellite data with ground-based sensors",
    version="2.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/aq/now")
async def get_current_air_quality(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get current air quality for a location"""
    # For now, return dummy data
    return {
        "lat": lat,
        "lon": lon,
        "timestamp": datetime.utcnow().isoformat(),
        "aqi": 65,
        "pm25": 15.5,
        "o3": 45.2,
        "category": "Moderate",
        "source": "demo_data"
    }

@app.get("/forecast")
async def get_air_quality_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    horizon: int = Query(24, description="Forecast horizon in hours"),
    use_real_data: bool = Query(True, description="Use real-time data sources"),
    target_date: Optional[str] = Query(None, description="Target date in YYYY-MM-DD format. If not provided, uses current date")
):
    """Get air quality forecast integrating NASA TEMPO, OpenAQ, and weather data"""
    try:
        # Parse and validate target date
        target_datetime = datetime.utcnow()
        is_historical = False
        is_future = False

        if target_date:
            try:
                target_datetime = datetime.strptime(target_date, "%Y-%m-%d")
                today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                target_day = target_datetime.replace(hour=0, minute=0, second=0, microsecond=0)

                is_historical = target_day < today
                is_future = target_day > today
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        if use_real_data:
            # Import here to avoid circular imports
            from data_sources import data_fusion_engine

            # Get comprehensive real-time data (for current conditions baseline)
            real_time_data = await data_fusion_engine.get_comprehensive_air_quality(lat, lon)
            
            # Extract current conditions from real data
            current_aqi = real_time_data.get("weather_adjusted_aqi") or real_time_data.get("overall_aqi", 50)
            current_pm25 = 0
            current_pollutants = real_time_data.get("pollutants", {})
            
            if "pm25" in current_pollutants:
                current_pm25 = current_pollutants["pm25"]["value"]
            else:
                current_pm25 = current_aqi * 0.4  # Estimate if not available
            
            # Generate forecast based on date type
            if is_historical:
                forecast_data = generate_historical_data(lat, lon, target_datetime, horizon, current_aqi, current_pm25)
                model_name = "historical_synthesis_v1"
                data_quality = "historical_estimate"
            elif is_future:
                forecast_data = generate_future_forecast(lat, lon, target_datetime, horizon, current_aqi, current_pm25)
                model_name = "predictive_model_v1"
                data_quality = "predictive"
            else:
                forecast_data = generate_realistic_forecast(lat, lon, current_aqi, current_pm25, horizon, real_time_data, target_datetime)
                model_name = "tempo_openaq_integrated_v1"
                data_quality = real_time_data.get("data_quality", "real_time")

            return {
                "lat": lat,
                "lon": lon,
                "forecast": forecast_data,
                "target_date": target_date,
                "is_historical": is_historical,
                "is_future": is_future,
                "real_time_data": real_time_data if not (is_historical or is_future) else None,
                "model": model_name,
                "data_sources": real_time_data.get("data_sources", {}) if not (is_historical or is_future) else {"type": "synthetic"},
                "data_quality": data_quality,
                "generated_at": datetime.utcnow().isoformat()
            }
        else:
            # Fallback to mock data
            return generate_mock_forecast(lat, lon, horizon)
            
    except Exception as e:
        print(f"Real-time data error: {e}")
        # Fallback to mock data if real data fails
        return generate_mock_forecast(lat, lon, horizon)

@app.post("/calendar/score")
async def score_calendar_events():
    """Score calendar events for air quality risk"""
    # Stub implementation
    return {
        "message": "Calendar scoring not yet implemented",
        "events": []
    }

@app.get("/health/recommendations")
async def get_health_recommendations_endpoint(
    aqi: int = Query(..., description="AQI value")
):
    """Get health recommendations for a specific AQI value"""
    return get_health_recommendations(aqi)

@app.get("/forecast-by-zip")
async def get_forecast_by_zipcode(
    zipcode: str = Query(..., description="5-digit US ZIP code", regex=r"^\d{5}$"),
    date: Optional[str] = Query(None, description="Forecast date in YYYY-MM-DD format (optional)"),
    distance: int = Query(25, description="Search radius in miles", ge=1, le=100)
):
    """Get air quality forecast by ZIP code from AirNow EPA

    Returns detailed forecast including:
    - AQI forecast by pollutant (PM2.5, O3, etc.)
    - EPA category and action day alerts
    - Discussion/explanation of forecast conditions
    - Reporting area and location details
    """
    try:
        from data_sources import AirNowDataSource

        airnow_source = AirNowDataSource()
        forecast_data = await airnow_source.get_forecast_by_zipcode(zipcode, date, distance)

        if not forecast_data:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast data available for ZIP code {zipcode}. This may be outside AirNow coverage or the ZIP code may be invalid."
            )

        # Add health recommendations based on overall AQI
        overall_aqi = forecast_data.get("overall_aqi")
        if overall_aqi:
            forecast_data["health_recommendations"] = get_health_recommendations(overall_aqi)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "zipcode": zipcode,
            "data": forecast_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch forecast for ZIP code {zipcode}: {str(e)}"
        )

@app.get("/observations/historical-by-zip")
async def get_historical_observations_by_zipcode(
    zipcode: str = Query(..., description="5-digit US ZIP code", regex=r"^\d{5}$"),
    date: str = Query(..., description="Date in YYYY-MM-DD format (e.g., '2025-10-03')"),
    distance: int = Query(25, description="Search radius in miles", ge=1, le=150)
):
    """Get historical AQI observations by ZIP code from AirNow EPA

    Returns real EPA observed data for a specific date:
    - Hourly AQI observations throughout the day
    - Multiple pollutants (PM2.5, Ozone, etc.)
    - EPA categories and reporting area information
    - Daily statistics (avg, min, max AQI)

    This replaces synthetic historical estimates with actual EPA observations.

    Useful for:
    - Historical trend analysis
    - Comparing past air quality
    - Validating forecasts
    - Understanding historical patterns

    Rate limit: 500 requests/hour
    """
    try:
        from data_sources import AirNowDataSource

        airnow_source = AirNowDataSource()
        historical_data = await airnow_source.get_historical_observations_by_zipcode(
            zipcode=zipcode,
            date=date,
            distance=distance
        )

        if not historical_data:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data available for ZIP code {zipcode} on {date}. Data may not exist for this location/date combination."
            )

        # Add health recommendations based on daily average AQI
        daily_avg = historical_data.get("daily_statistics", {}).get("avg_aqi")
        if daily_avg:
            historical_data["health_recommendations"] = get_health_recommendations(int(daily_avg))

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "query": {
                "zipcode": zipcode,
                "date": date,
                "distance": distance
            },
            "data": historical_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch historical observations for ZIP code {zipcode}: {str(e)}"
        )

@app.get("/observations/monitoring-sites")
async def get_monitoring_site_observations(
    bbox: str = Query(..., description="Bounding box as 'minX,minY,maxX,maxY' (e.g., '-90.806,24.634,-71.119,45.910')"),
    parameters: str = Query("ozone,pm25,pm10", description="Comma-separated pollutants: ozone,pm25,pm10,co,no2,so2"),
    startdate: Optional[str] = Query(None, description="Start date UTC 'yyyy-MM-ddTHH:mm' (e.g., '2025-10-03T13:00')"),
    enddate: Optional[str] = Query(None, description="End date UTC 'yyyy-MM-ddTHH:mm' (e.g., '2025-10-03T14:00')"),
    datatype: str = Query("B", description="A=AQI only, C=Concentration only, B=Both", regex=r"^[ABC]$"),
    monitortype: Optional[int] = Query(None, description="0=Permanent, 1=Mobile, 2=Both", ge=0, le=2),
    verbose: bool = Query(True, description="Include site metadata (name, agency, AQS ID)"),
    include_raw_concentrations: bool = Query(True, description="Include raw concentration values")
):
    """Get detailed observations from AirNow EPA monitoring sites by bounding box

    This endpoint provides:
    - Raw observational data from EPA monitoring stations
    - Both AQI and concentration values for multiple pollutants
    - Site metadata (names, agencies, AQS codes)
    - Historical data via date range filtering
    - Summary statistics per pollutant

    Useful for:
    - Regional air quality analysis
    - Historical trend analysis
    - Scientific research requiring raw concentration data
    - Identifying specific monitoring stations
    - Data export for external analysis

    Rate limit: 500 requests/hour
    """
    try:
        from data_sources import AirNowDataSource

        airnow_source = AirNowDataSource()
        observations_data = await airnow_source.get_monitoring_site_observations(
            bbox=bbox,
            parameters=parameters,
            startdate=startdate,
            enddate=enddate,
            datatype=datatype,
            monitortype=monitortype,
            verbose=verbose,
            include_raw_concentrations=include_raw_concentrations
        )

        if not observations_data:
            raise HTTPException(
                status_code=404,
                detail=f"No monitoring site data available for the specified bounding box and parameters."
            )

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "query": {
                "bbox": bbox,
                "parameters": parameters.split(","),
                "startdate": startdate,
                "enddate": enddate,
                "datatype": datatype,
                "monitortype": monitortype
            },
            "data": observations_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch monitoring site observations: {str(e)}"
        )

@app.get("/realtime/detailed")
async def get_detailed_realtime_data(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """Get detailed real-time data from all sources (NASA TEMPO, OpenAQ, Weather)"""
    try:
        from data_sources import data_fusion_engine
        
        real_time_data = await data_fusion_engine.get_comprehensive_air_quality(lat, lon)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "location": {"lat": lat, "lon": lon},
            "data": real_time_data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch real-time data: {str(e)}"
        )

@app.get("/aqi/regional")
async def get_regional_aqi_data(
    north: float = Query(..., description="Northern boundary latitude"),
    south: float = Query(..., description="Southern boundary latitude"),
    east: float = Query(..., description="Eastern boundary longitude"),
    west: float = Query(..., description="Western boundary longitude"),
    grid_size: int = Query(10, description="Grid density (points per side)")
):
    """Get AQI data for a regional area with grid points"""
    try:
        from data_sources import data_fusion_engine

        # Calculate grid points within bounds
        lat_step = (north - south) / grid_size
        lon_step = (east - west) / grid_size

        grid_data = []

        for i in range(grid_size + 1):
            for j in range(grid_size + 1):
                lat = south + (i * lat_step)
                lon = west + (j * lon_step)

                try:
                    # Get AQI data for this grid point
                    aqi_data = await data_fusion_engine.get_comprehensive_air_quality(lat, lon)
                    aqi_value = aqi_data.get("weather_adjusted_aqi") or aqi_data.get("overall_aqi", 50)

                    grid_data.append({
                        "lat": lat,
                        "lon": lon,
                        "aqi": min(500, max(0, int(aqi_value))),  # Clamp between 0-500
                        "category": get_aqi_category(aqi_value),
                        "color": get_aqi_color(aqi_value)
                    })
                except Exception as e:
                    # If individual point fails, use a fallback value
                    fallback_aqi = 75 + (i + j) * 5  # Slight variation for demo
                    grid_data.append({
                        "lat": lat,
                        "lon": lon,
                        "aqi": min(500, max(0, int(fallback_aqi))),
                        "category": get_aqi_category(fallback_aqi),
                        "color": get_aqi_color(fallback_aqi)
                    })

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "bounds": {
                "north": north,
                "south": south,
                "east": east,
                "west": west
            },
            "grid_size": grid_size,
            "data_points": len(grid_data),
            "data": grid_data
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch regional AQI data: {str(e)}"
        )

def get_aqi_category(aqi: float) -> str:
    """Get AQI category based on value"""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"

def get_aqi_color(aqi: float) -> str:
    """Get AQI color based on value"""
    if aqi <= 50:
        return "#00E400"  # Green
    elif aqi <= 100:
        return "#FFFF00"  # Yellow
    elif aqi <= 150:
        return "#FF7E00"  # Orange
    elif aqi <= 200:
        return "#FF0000"  # Red
    elif aqi <= 300:
        return "#8F3F97"  # Purple
    else:
        return "#7E0023"  # Maroon

@app.get("/aqi/reference")
async def get_aqi_reference():
    """Get AQI reference table with all categories and recommendations"""
    return {
        "categories": [
            {
                "range": "0-50",
                "level": "Good",
                "color": "#00e400",
                "description": "Air quality is excellent",
                "health_impact": "No health impacts expected",
                "recommendations": ["Perfect for all outdoor activities", "Great for exercise", "Safe for everyone"]
            },
            {
                "range": "51-100", 
                "level": "Moderate",
                "color": "#ffff00",
                "description": "Air quality is acceptable",
                "health_impact": "Minor symptoms possible for very sensitive people",
                "recommendations": ["Generally safe for outdoor activities", "Sensitive individuals should monitor symptoms"]
            },
            {
                "range": "101-150",
                "level": "Unhealthy for Sensitive Groups",
                "color": "#ff7e00",
                "description": "Sensitive groups should take precautions",
                "health_impact": "Increased symptoms for sensitive groups",
                "recommendations": ["Sensitive individuals should wear masks", "Limit prolonged outdoor activities", "Use air purifiers"]
            },
            {
                "range": "151-200",
                "level": "Unhealthy", 
                "color": "#ff0000",
                "description": "Everyone should take precautions",
                "health_impact": "Health effects possible for everyone",
                "recommendations": ["Wear N95 masks outdoors", "Stay indoors when possible", "Avoid outdoor exercise"]
            },
            {
                "range": "201-300",
                "level": "Very Unhealthy",
                "color": "#8f3f97",
                "description": "Health alert for everyone",
                "health_impact": "Serious health effects for everyone",
                "recommendations": ["Emergency precautions", "Stay indoors", "Seek medical attention if symptomatic"]
            },
            {
                "range": "301+",
                "level": "Hazardous",
                "color": "#7e0023", 
                "description": "Health emergency",
                "health_impact": "Life-threatening conditions",
                "recommendations": ["Emergency conditions", "Avoid all outdoor exposure", "Immediate medical attention if needed"]
            }
        ],
        "sources": ["EPA Air Quality Standards", "WHO Air Quality Guidelines"],
        "last_updated": datetime.utcnow().isoformat()
    }

def get_aqi_category(aqi: int) -> str:
    """Convert AQI value to EPA category"""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"

def generate_realistic_forecast(lat: float, lon: float, current_aqi: int, current_pm25: float,
                               horizon: int, real_time_data: dict, target_datetime: datetime = None) -> list:
    """Generate realistic forecast based on real current conditions"""
    forecast_data = []
    
    # Extract weather influence
    weather_data = real_time_data.get("weather_data", {})
    weather_impact = weather_data.get("air_quality_impact", "moderate")
    wind_speed = weather_data.get("wind_speed", 5)
    
    for i in range(horizon):
        # Time-based adjustments
        hour_of_day = (datetime.utcnow().hour + i) % 24
        
        # Daily pattern adjustments
        daily_factor = 1.0
        if 7 <= hour_of_day <= 9 or 17 <= hour_of_day <= 19:  # Rush hours
            daily_factor = 1.2
        elif 22 <= hour_of_day or hour_of_day <= 5:  # Night
            daily_factor = 0.8
        elif 10 <= hour_of_day <= 16:  # Midday photochemical activity
            daily_factor = 1.1
        
        # Weather influence over time
        weather_factor = 1.0
        if weather_impact == "good_dispersion":
            weather_factor = 0.9 - (i * 0.01)  # Improves over time
        elif weather_impact == "poor_dispersion":
            weather_factor = 1.1 + (i * 0.01)  # Worsens over time
        elif weather_impact == "cleansing":
            weather_factor = 0.8 + (i * 0.02)  # Improves then gradually returns
        
        # Calculate forecasted AQI
        forecasted_aqi = current_aqi * daily_factor * weather_factor
        forecasted_aqi = max(5, min(300, int(forecasted_aqi)))
        
        # Calculate PM2.5 based on AQI
        forecasted_pm25 = max(0, current_pm25 * daily_factor * weather_factor)
        
        # Uncertainty increases with time
        uncertainty = 10 + (i * 2)
        lower_bound = max(0, forecasted_aqi - uncertainty)
        upper_bound = min(500, forecasted_aqi + uncertainty)
        
        forecast_entry = {
            "hour": i,
            "timestamp": (datetime.utcnow() + timedelta(hours=i)).isoformat(),
            "aqi": forecasted_aqi,
            "aqi_lower": int(lower_bound),
            "aqi_upper": int(upper_bound),
            "pm25": round(forecasted_pm25, 1),
            "category": get_aqi_category(forecasted_aqi)
        }
        
        # Add health recommendations for current hour
        if i == 0:
            forecast_entry["health_recommendations"] = get_health_recommendations(forecasted_aqi)
            forecast_entry["real_time_sources"] = {
                "satellite_data": real_time_data.get("data_sources", {}).get("satellite", False),
                "ground_sensors": real_time_data.get("data_sources", {}).get("ground_sensors", False),
                "weather_data": real_time_data.get("data_sources", {}).get("weather", False)
            }
        
        forecast_data.append(forecast_entry)
    
    return forecast_data

def generate_mock_forecast(lat: float, lon: float, horizon: int) -> dict:
    """Generate mock forecast data (fallback)"""
    # Use location to seed random data (so same location gives consistent results)
    location_seed = int(hashlib.md5(f"{lat:.2f},{lon:.2f}".encode()).hexdigest()[:8], 16)
    random.seed(location_seed)
    
    # Generate location-based base AQI (varies by geography)
    base_aqi = 30 + int((abs(lat) + abs(lon)) * 2) % 120  # Range 30-150
    base_aqi += random.randint(-15, 15)  # Add some randomness
    base_aqi = max(10, min(200, base_aqi))  # Keep in reasonable range
    
    forecast_data = []
    
    for i in range(horizon):
        # More realistic daily patterns
        hour_of_day = (i) % 24
        
        # Daily pattern: worse during rush hours, better at night
        daily_factor = 1.0
        if 7 <= hour_of_day <= 9 or 17 <= hour_of_day <= 19:  # Rush hours
            daily_factor = 1.3
        elif 22 <= hour_of_day or hour_of_day <= 5:  # Night/early morning
            daily_factor = 0.7
        
        # Some randomness and trend
        trend_factor = 1 + (i * 0.02) + random.uniform(-0.1, 0.1)
        
        aqi = int(base_aqi * daily_factor * trend_factor)
        aqi = max(5, min(300, aqi))  # Keep in valid range
        
        # Uncertainty bands
        lower_bound = max(0, aqi - random.randint(15, 25))
        upper_bound = min(500, aqi + random.randint(15, 25))
        
        forecast_data.append({
            "hour": i,
            "timestamp": (datetime.utcnow() + timedelta(hours=i)).isoformat(),
            "aqi": aqi,
            "aqi_lower": lower_bound,
            "aqi_upper": upper_bound,
            "pm25": round(aqi * 0.3 + random.uniform(-2, 2), 1),  # More realistic PM2.5
            "category": get_aqi_category(aqi),
            "health_recommendations": get_health_recommendations(aqi) if i == 0 else None  # Only include for current hour
        })
    
    return {
        "lat": lat,
        "lon": lon,
        "forecast": forecast_data,
        "model": "mock_data_fallback",
        "generated_at": datetime.utcnow().isoformat()
    }

def get_health_recommendations(aqi: int) -> dict:
    """Get health recommendations based on AQI level following international standards"""
    if aqi <= 50:  # Good
        return {
            "level": "Good",
            "message": "Air quality is excellent! Perfect for all outdoor activities.",
            "recommendations": [
                "🚴‍♂️ Great time for outdoor exercise and activities",
                "🌳 Enjoy walks in parks and nature",
                "🏃‍♀️ Perfect for jogging and running",
                "👶 Safe for children to play outside"
            ],
            "sensitive_groups": "No precautions needed for any group",
            "mask_needed": False,
            "outdoor_activities": "Highly recommended"
        }
    elif aqi <= 100:  # Moderate
        return {
            "level": "Moderate",
            "message": "Air quality is acceptable for most people.",
            "recommendations": [
                "🚶‍♂️ Outdoor activities are generally safe",
                "👥 Sensitive individuals should consider reducing prolonged outdoor activities",
                "🌅 Early morning and evening are best times for outdoor exercise",
                "💨 Ensure good ventilation indoors"
            ],
            "sensitive_groups": "Sensitive individuals may experience minor symptoms",
            "mask_needed": False,
            "outdoor_activities": "Generally safe"
        }
    elif aqi <= 150:  # Unhealthy for Sensitive Groups
        return {
            "level": "Unhealthy for Sensitive Groups",
            "message": "Sensitive groups should take precautions.",
            "recommendations": [
                "😷 Consider wearing masks for sensitive individuals",
                "🏠 Limit prolonged outdoor activities for sensitive groups",
                "🌬️ Use air purifiers indoors",
                "⚡ Reduce outdoor exercise intensity",
                "👴 Elderly and children should stay indoors when possible"
            ],
            "sensitive_groups": "Children, elderly, and people with heart/lung conditions should limit outdoor exposure",
            "mask_needed": True,
            "outdoor_activities": "Limited for sensitive groups"
        }
    elif aqi <= 200:  # Unhealthy
        return {
            "level": "Unhealthy",
            "message": "Everyone should take precautions to limit exposure.",
            "recommendations": [
                "😷 Wear N95 or equivalent masks when outdoors",
                "🏠 Stay indoors as much as possible",
                "🚫 Avoid outdoor exercise and strenuous activities",
                "🪟 Keep windows and doors closed",
                "🌬️ Use HEPA air purifiers indoors",
                "💊 Have medications ready if you have respiratory conditions"
            ],
            "sensitive_groups": "High risk - should avoid outdoor activities entirely",
            "mask_needed": True,
            "outdoor_activities": "Not recommended"
        }
    elif aqi <= 300:  # Very Unhealthy
        return {
            "level": "Very Unhealthy",
            "message": "Health alert! Everyone should avoid outdoor activities.",
            "recommendations": [
                "🚨 Emergency precautions - stay indoors",
                "😷 Wear N95/P100 masks if you must go outside",
                "🏥 Seek medical attention if experiencing symptoms",
                "🚫 Cancel all outdoor activities and events",
                "🌬️ Use multiple air purifiers and seal windows",
                "📞 Check on elderly neighbors and relatives"
            ],
            "sensitive_groups": "Emergency risk - seek immediate medical attention if experiencing symptoms",
            "mask_needed": True,
            "outdoor_activities": "Strongly discouraged"
        }
    else:  # Hazardous (300+)
        return {
            "level": "Hazardous",
            "message": "Health emergency! Avoid all outdoor exposure.",
            "recommendations": [
                "🆘 Emergency conditions - stay indoors immediately",
                "😷 N95/P100 masks required for any outdoor exposure",
                "🏥 Seek immediate medical attention if experiencing any symptoms",
                "📱 Monitor local emergency alerts",
                "🌬️ Seal all air leaks and use professional air filtration",
                "🚨 Consider evacuation if conditions persist"
            ],
            "sensitive_groups": "Life-threatening conditions - immediate medical attention may be required",
            "mask_needed": True,
            "outdoor_activities": "Prohibited"
        }

async def get_real_historical_data_from_airnow(lat: float, lon: float, target_date: datetime, horizon: int = 24) -> Optional[list]:
    """Fetch real historical data from AirNow API if available"""
    try:
        from data_sources import AirNowDataSource
        from utils.geocoding import reverse_geocode  # We'll need ZIP code

        # For now, we don't have reverse geocoding, so return None
        # This function will be improved when geocoding utils are available
        return None
    except Exception as e:
        print(f"Could not fetch real historical data: {e}")
        return None

def generate_historical_data(lat: float, lon: float, target_date: datetime, horizon: int,
                           baseline_aqi: int, baseline_pm25: float) -> list:
    """Generate synthetic historical AQI data based on seasonal patterns and location characteristics"""
    historical_data = []

    # Seasonal adjustment factors
    month = target_date.month
    seasonal_factor = 1.0

    # Winter months typically have higher AQI due to heating, inversions
    if month in [12, 1, 2]:
        seasonal_factor = 1.3
    # Spring has moderate levels
    elif month in [3, 4, 5]:
        seasonal_factor = 0.9
    # Summer can vary - higher ozone but better dispersion
    elif month in [6, 7, 8]:
        seasonal_factor = 1.1
    # Fall generally better air quality
    else:
        seasonal_factor = 0.8

    # Location-based adjustments (rough approximations)
    location_factor = 1.0
    if abs(lat) > 40:  # Northern regions
        location_factor = 1.2
    if abs(lon) > 100:  # Continental interior
        location_factor = 1.1

    # Historical base AQI with variations
    historical_base = max(10, int(baseline_aqi * seasonal_factor * location_factor * 0.8))

    for hour in range(horizon):
        # Daily cycle: worse in morning/evening, better midday
        time_of_day = (hour % 24) / 24
        daily_factor = 1.0 + 0.3 * abs(0.5 - time_of_day)  # Peak at 0 and 24h, minimum at 12h

        # Add some randomness for historical variation
        random_factor = 0.7 + (random.random() * 0.6)  # 0.7 to 1.3

        historical_aqi = max(5, min(300, int(historical_base * daily_factor * random_factor)))
        historical_pm25 = max(0, baseline_pm25 * seasonal_factor * random_factor)

        # Create timestamp for this historical hour
        timestamp = (target_date + timedelta(hours=hour)).isoformat()

        historical_data.append({
            "hour": hour,
            "timestamp": timestamp,
            "aqi": historical_aqi,
            "aqi_lower": max(0, historical_aqi - 15),
            "aqi_upper": min(500, historical_aqi + 15),
            "pm25": round(historical_pm25, 1),
            "category": get_aqi_category(historical_aqi),
            "data_type": "historical_estimate",
            "confidence": "medium"
        })

    return historical_data

def generate_future_forecast(lat: float, lon: float, target_date: datetime, horizon: int,
                           baseline_aqi: int, baseline_pm25: float) -> list:
    """Generate predictive forecast for future dates based on trends and patterns"""
    future_data = []

    # Calculate days into future for trend adjustments
    days_ahead = (target_date - datetime.utcnow()).days

    # Future uncertainty increases with time
    uncertainty_factor = min(2.0, 1.0 + (days_ahead / 30))  # Max 2x uncertainty after 30 days

    # Seasonal predictions
    month = target_date.month
    seasonal_prediction = 1.0

    if month in [12, 1, 2]:  # Winter prediction
        seasonal_prediction = 1.4
    elif month in [3, 4, 5]:  # Spring
        seasonal_prediction = 0.8
    elif month in [6, 7, 8]:  # Summer
        seasonal_prediction = 1.2
    else:  # Fall
        seasonal_prediction = 0.7

    # Climate trend (slight worsening over time due to global trends)
    climate_trend = 1.0 + (days_ahead / 3650)  # 10 years to reach 10% increase

    predicted_base = int(baseline_aqi * seasonal_prediction * climate_trend)

    for hour in range(horizon):
        # Daily variation pattern
        time_factor = 1.0 + 0.4 * abs(0.5 - ((hour % 24) / 24))

        # Weather pattern simulation (simplified)
        weather_variation = 0.6 + (random.random() * 0.8)  # 0.6 to 1.4

        predicted_aqi = max(10, min(400, int(predicted_base * time_factor * weather_variation)))
        predicted_pm25 = max(0, baseline_pm25 * seasonal_prediction * weather_variation)

        # Wider uncertainty bounds for future predictions
        uncertainty = int(predicted_aqi * uncertainty_factor * 0.3)

        timestamp = (target_date + timedelta(hours=hour)).isoformat()

        future_data.append({
            "hour": hour,
            "timestamp": timestamp,
            "aqi": predicted_aqi,
            "aqi_lower": max(0, predicted_aqi - uncertainty),
            "aqi_upper": min(500, predicted_aqi + uncertainty),
            "pm25": round(predicted_pm25, 1),
            "category": get_aqi_category(predicted_aqi),
            "data_type": "predictive",
            "confidence": "low" if days_ahead > 7 else "medium",
            "uncertainty": uncertainty
        })

    return future_data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)