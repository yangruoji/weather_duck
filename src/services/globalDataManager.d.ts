export interface GlobalDataManager {
  initialize(startDate: string, endDate: string, latitude: number, longitude: number): Promise<void>
  getDiary(date: string): any
  getWeatherList(): any[]
  refreshDate(date: string): Promise<any>
  clearCache(): void
}

export declare const globalDataManager: GlobalDataManager
export default globalDataManager