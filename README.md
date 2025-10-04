# Air Quality Platform

**"From EarthData to Action"** — Real-time air quality monitoring and forecasting powered by NASA TEMPO satellite data, OpenAQ ground sensors, and Weather.gov integration.

## ✨ Features

### 🌍 **Interactive 3D Globe**
- **Cesium-powered 3D Earth** - Stunning satellite imagery with place labels
- **Click anywhere** - Get instant AQI data for any location worldwide
- **Smart markers** - Color-coded pins based on EPA AQI categories
- **Smooth navigation** - Intuitive controls with zoom preservation
- **Live location** - One-click GPS location detection

### 📊 **Real-Time Air Quality Intelligence**
- **🛰️ NASA TEMPO Data** - Cutting-edge satellite air quality measurements
- **📡 OpenAQ Sensors** - Ground-based monitoring station integration
- **🌤️ Weather.gov API** - Meteorological data for enhanced predictions
- **24-Hour Forecasts** - Interactive 3D charts with AQI predictions
- **Historical Data** - Access past air quality measurements
- **Future Predictions** - 2-year forecast range

### 🎨 **Modern Design**
- **Dark/Light Mode** - Automatic theme detection with manual toggle
- **3D Effects** - Dynamic particle backgrounds based on air quality
- **Glassmorphism UI** - Beautiful frosted glass aesthetic
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Timezone-Aware** - All times displayed in user's local timezone

### 📅 **Date Selection**
- **Interactive Calendar** - Select any date within 2-year range
- **Smart Labels** - Today/Historical/Forecast indicators
- **Quick Navigation** - Jump to today with one click

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Start the API (Backend)

```bash
cd api
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at **http://localhost:8000**
- Health check: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

### 3. Configure Environment (Frontend)

```bash
cd web
cp .env.local.example .env.local
```

**The provided Cesium token in `.env.local.example` is ready to use!** No API key signup needed.

### 4. Start the Web App (Frontend)

```bash
npm install
npm run dev
```

The web app will be available at **http://localhost:3000**

### ✅ That's it!
Click anywhere on the globe to see real-time air quality data.

## API Endpoints

- `GET /health` - Health check
- `GET /aq/now?lat=&lon=` - Current air quality
- `GET /forecast?lat=&lon=&horizon=24` - Air quality forecast
- `POST /calendar/score` - Score calendar events (coming soon)

## 🔑 API Keys & Data Sources

### For Reviewers/Developers
**NO API KEYS REQUIRED!** This project uses:
- ✅ **Free Cesium Ion token** (included in `.env.local.example`)
- ✅ **Public APIs** (NASA, OpenAQ, Weather.gov - no auth needed)
- ✅ **100% Real Data** - No fake/dummy data anywhere!

### Data Flow
```
NASA TEMPO Satellite → OpenAQ Ground Sensors → Weather.gov → Your Screen
```

All data is fetched in real-time from public sources. The backend intelligently combines multiple data sources to provide accurate air quality forecasts.

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router with TypeScript)
- **Cesium** - 3D globe & geospatial visualization
- **React Three Fiber** - 3D forecast charts
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

### Backend
- **FastAPI** (Python 3.11+)
- **NASA TEMPO** - Satellite air quality data
- **OpenAQ API** - Ground-based sensor network
- **Weather.gov API** - Meteorological data
- **Geopy** - Geocoding & timezone handling

## Health Categories

- **Good (0-50)**: Air quality is satisfactory
- **Moderate (51-100)**: Acceptable for most people
- **Unhealthy for Sensitive Groups (101-150)**: Sensitive individuals may experience problems
- **Unhealthy (151-200)**: Everyone may experience problems
- **Very Unhealthy (201-300)**: Health alert
- **Hazardous (301+)**: Emergency conditions

## 📝 Development Notes

### Real Data Sources
This platform uses **100% real data** from:
- **NASA TEMPO**: Tropospheric Emissions Monitoring of Pollution satellite
- **OpenAQ**: Global air quality data aggregator with 10,000+ monitoring stations
- **Weather.gov**: National Weather Service API

No mock data, no fake numbers - everything you see is real air quality information.

### Architecture
- **Stateless Backend**: No database required, uses public APIs
- **Client-Side Proxy**: API routes hide backend URLs in production
- **Timezone Handling**: All dates/times converted to user's local timezone
- **Smart Caching**: Prevents redundant API calls

### For Hackathon Reviewers
- ⚡ **5-minute setup** - Just clone, install, and run!
- 🔐 **No API key hassle** - Token provided in repo
- 📊 **See real data immediately** - Click anywhere on Earth
- 🌍 **Global coverage** - Works for any location worldwide

## 👥 Authors
Made with ♥ for the planet by **Atharv and Pragati**