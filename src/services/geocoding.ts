import axios from 'axios'

export interface ReverseGeocodeResult {
  countryName?: string
  principalSubdivision?: string
  city?: string
  locality?: string
  localityInfo?: unknown
}

export class GeocodingService {
  static async reverseGeocode(
    latitude: number,
    longitude: number,
    language: string = 'zh'
  ): Promise<string> {
    try {
      const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
      const { data } = await axios.get<ReverseGeocodeResult>(url, {
        params: {
          latitude,
          longitude,
          localityLanguage: language
        },
        timeout: 8000
      })

      const parts: string[] = []
      const city = (data as any).city || (data as any).locality
      const subdivision = (data as any).principalSubdivision
      const country = (data as any).countryName

      if (city) parts.push(city)
      if (subdivision && subdivision !== city) parts.push(subdivision)
      if (country && country !== subdivision) parts.push(country)

      return parts.join(' · ') || '未知位置'
    } catch (e) {
      return '未知位置'
    }
  }

  // Open-Meteo Forward Geocoding
  static async searchCity(
    name: string,
    count: number = 7,
    language: string = 'zh'
  ): Promise<Array<{ label: string; value: string; lat: number; lon: number }>> {
    if (!name || !name.trim()) return []
    try {
      const url = 'https://geocoding-api.open-meteo.com/v1/search'
      const { data } = await axios.get(url, {
        params: {
          name,
          count,
          language
        },
        timeout: 8000
      })
      const results = Array.isArray(data?.results) ? data.results : []
      return results.map((r: any) => {
        const parts = [r.name, r.admin1, r.country].filter(Boolean)
        const label = parts.join(' · ')
        const lat = Number(r.latitude)
        const lon = Number(r.longitude)
        return {
          label,
          value: `${lat},${lon}`,
          lat,
          lon
        }
      })
    } catch (e) {
      return []
    }
  }
}
