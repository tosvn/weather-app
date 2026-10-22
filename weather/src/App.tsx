import { useEffect, useState } from 'react'
import './App.css'

type WeatherState =
  | { status: 'loading' }
  | { status: 'success'; temperature: number }
  | { status: 'error'; message: string }

type GeocodingResponse = {
  results?: Array<{
    name: string
    latitude: number
    longitude: number
    country: string
  }>
}

type ForecastResponse = {
  current?: {
    temperature_2m: number
  }
}

function App() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      try {
        const locationResponse = await fetch(
          'https://geocoding-api.open-meteo.com/v1/search?name=Lagos&count=1&language=en&format=json&countryCode=NG',
        )
        if (!locationResponse.ok) {
          throw new Error('Could not look up Lagos.')
        }

        const locationData: GeocodingResponse = await locationResponse.json()
        const location = locationData.results?.[0]
        if (!location) {
          throw new Error('Lagos, Nigeria was not found.')
        }

        const forecastUrl = new URL(
          'https://api.open-meteo.com/v1/forecast',
        )
        forecastUrl.search = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current: 'temperature_2m',
        }).toString()

        const forecastResponse = await fetch(forecastUrl)
        if (!forecastResponse.ok) {
          throw new Error('Could not fetch the current temperature.')
        }

        const forecastData: ForecastResponse = await forecastResponse.json()
        const temperature = forecastData.current?.temperature_2m
        if (typeof temperature !== 'number') {
          throw new Error('The current temperature is unavailable.')
        }

        if (!cancelled) {
          setWeather({ status: 'success', temperature })
        }
      } catch (error) {
        if (!cancelled) {
          setWeather({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Something went wrong while fetching the weather.',
          })
        }
      }
    }

    void loadWeather()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="weather-page">
      <section className="weather-card" aria-labelledby="weather-title">
        <p className="eyebrow">CURRENT WEATHER</p>
        <h1 id="weather-title">Lagos, Nigeria</h1>
        <p className="location-note">Right now in the city</p>

        {weather.status === 'loading' && (
          <p className="weather-message" role="status">
            Finding the current temperature…
          </p>
        )}
        {weather.status === 'success' && (
          <p className="temperature" aria-label={`Temperature: ${weather.temperature} degrees Celsius`}>
            {weather.temperature}
            <span>°C</span>
          </p>
        )}
        {weather.status === 'error' && (
          <p className="weather-message error" role="alert">
            {weather.message}
          </p>
        )}

        <p className="attribution">
          Temperature data from{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>
        </p>
      </section>
    </main>
  )
}

export default App
