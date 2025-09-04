export declare class DiaryService {
  constructor();
  getDiaries(limit?: number, forceRefresh?: boolean): Promise<any[]>;
  getDiariesByDateRange(startDate: string, endDate: string, forceRefresh?: boolean): Promise<any[]>;
  getDiaryByDate(date: string, forceRefresh?: boolean): Promise<any>;
  createDiary(diaryData: any): Promise<any>;
  updateDiary(id: string, diaryData: any): Promise<any>;
  deleteDiary(id: string): Promise<boolean>;
  updateCacheAfterModification(diary: any): void;
  clearDiaryCache(): void;
  refreshDiaryByDate(date: string): Promise<any>;
  preloadAdjacentDiaries(currentDate: string): Promise<void>;
}

export declare const diaryService: DiaryService;
export default diaryService;