export declare class CacheService {
  constructor();
  generateKey(type: string, params: any): string;
  set(key: string, data: any, ttl?: number): void;
  get(key: string): any;
  delete(key: string): void;
  clear(): void;
  cleanup(): void;
  has(key: string): boolean;
  keys(): string[];
  invalidateByType(type: string): void;
}

export declare const cacheService: CacheService;
export default cacheService;