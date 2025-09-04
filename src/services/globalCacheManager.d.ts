export declare class GlobalCacheManager {
  constructor();
  init(): void;
  handleOnline(): void;
  handleOffline(): void;
  handleVisibilityChange(): void;
  checkCacheExpiry(): void;
  warmupCache(latitude: number, longitude: number, dateRange: { start: string; end: string }): Promise<void>;
  clearAllCache(): void;
  getCacheStats(): { total: number; weather: number; diary: number };
  refreshDateData(date: string, latitude: number, longitude: number): Promise<void>;
  refreshDateRangeData(startDate: string, endDate: string, latitude: number, longitude: number): Promise<void>;
  smartCleanup(): void;
}

export declare const globalCacheManager: GlobalCacheManager;
export default globalCacheManager;