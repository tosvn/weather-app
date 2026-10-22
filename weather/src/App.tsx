import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import './App.css'

type WeatherState =
  | { status: 'loading'; city: string }
  | { status: 'success'; city: string; temperature: number }
  | { status: 'error'; city: string; message: string }

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

async function fetchCityWeather(
  city: string,
): Promise<{ city: string; temperature: number }> {
  const geocodingUrl = new URL(
    'https://geocoding-api.open-meteo.com/v1/search',
  )
  geocodingUrl.search = new URLSearchParams({
    name: city,
    count: '1',
    language: 'en',
    format: 'json',
  }).toString()

  const locationResponse = await fetch(geocodingUrl)
  if (!locationResponse.ok) {
    throw new Error(`Could not look up ${city}.`)
  }

  const locationData: GeocodingResponse = await locationResponse.json()
  const location = locationData.results?.[0]
  if (!location) {
    throw new Error(`No matching city was found for "${city}".`)
  }

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
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

  return {
    city: `${location.name}, ${location.country}`,
    temperature,
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong while fetching the weather.'
}

function App() {
  const [cityQuery, setCityQuery] = useState('Lagos')
  const [weather, setWeather] = useState<WeatherState>({
    status: 'loading',
    city: 'Lagos',
  })
  const requestId = useRef(0)

  useEffect(() => {
    let cancelled = false
    const initialRequest = ++requestId.current

    async function loadInitialWeather() {
      try {
        const result = await fetchCityWeather('Lagos')
        if (!cancelled && requestId.current === initialRequest) {
          setWeather({ status: 'success', ...result })
        }
      } catch (error) {
        if (!cancelled && requestId.current === initialRequest) {
          setWeather({
            status: 'error',
            city: 'Lagos',
            message: getErrorMessage(error),
          })
        }
      }
    }

    void loadInitialWeather()
    return () => {
      cancelled = true
      requestId.current += 1
    }
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const city = cityQuery.trim()
    if (city) {
      const currentRequest = ++requestId.current
      setCityQuery(city)
      setWeather({ status: 'loading', city })

      async function loadWeather() {
        try {
          const result = await fetchCityWeather(city)
          if (requestId.current === currentRequest) {
            setWeather({ status: 'success', ...result })
          }
        } catch (error) {
          if (requestId.current === currentRequest) {
            setWeather({
              status: 'error',
              city,
              message: getErrorMessage(error),
            })
          }
        }
      }

      void loadWeather()
    }
  }

  return (
    <main className="weather-page">
      <section className="weather-card" aria-labelledby="weather-title">
        <p className="eyebrow">CURRENT WEATHER</p>
        <h1 id="weather-title">{weather.city}</h1>
        <p className="location-note">Right now in the city</p>

        <form className="search-form" onSubmit={handleSearch}>
          <label className="visually-hidden" htmlFor="city-search">
            Search for a city
          </label>
          <input
            id="city-search"
            type="search"
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder="Enter a city"
            required
          />
          <button type="submit">Search</button>
        </form>

        {weather.status === 'loading' && (
          <p className="weather-message" role="status">
            Finding the current temperature in {weather.city}…
          </p>
        )}
        {weather.status === 'success' && (
          <p
            className="temperature"
            aria-label={`Temperature: ${weather.temperature} degrees Celsius`}
          >
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
