export interface WeatherData {
  date: string
  temperature: {
    min: number
    max: number
    current: number
  }
  humidity: number
  windSpeed: number
  windDirection: string
  precipitation: number
  cloudCover: number
  description: string
  icon: string
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface WeatherApiResponse {
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    windspeed_10m_max: number[]
    winddirection_10m_dominant?: number[]
    cloudcover_mean?: number[]
    weathercode?: number[]
  }
  daily_units: {
    temperature_2m_max: string
    temperature_2m_min: string
    precipitation_sum: string
    windspeed_10m_max: string
    winddirection_10m_dominant?: string
    cloudcover_mean?: string
    weathercode?: string
  }
}
