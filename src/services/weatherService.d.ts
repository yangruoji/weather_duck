export declare class WeatherService {
  constructor();
  getCurrentWeather(latitude: number, longitude: number, forceRefresh?: boolean): Promise<any>;
  getForecast(latitude: number, longitude: number, days?: number, forceRefresh?: boolean): Promise<any>;
  getHistoricalWeather(latitude: number, longitude: number, startDate: string, endDate: string, forceRefresh?: boolean): Promise<any>;
  getWeatherForDateRange(latitude: number, longitude: number, startDate: string, endDate: string, forceRefresh?: boolean): Promise<any>;
  clearWeatherCache(): void;
  refreshWeatherData(type: string, ...args: any[]): Promise<any>;
}

export declare const weatherService: WeatherService;
export default weatherService;