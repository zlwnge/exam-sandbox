import { get } from '@/lib/api';
import { ApiSingleResponse } from '@/types/api';

export interface SubjectHierarchy {
  subject: string;
  cnt: number;
  types: {
    question_type: string;
    cnt: number;
    knowledge: { tag: string; cnt: number }[];
  }[];
}

export interface HeatmapData {
  data: Record<string, number>;
  stats: {
    totalRecords: number;
    totalDays: number;
    peakDay: number;
  };
  availableYears: number[];
}

export class StatsService {
  static async getHierarchy(): Promise<SubjectHierarchy[]> {
    const res = await get<ApiSingleResponse<{ hierarchy: SubjectHierarchy[] }>>('/api/stats');
    return (res as any).hierarchy || [];
  }

  static async getHeatmap(year: number): Promise<HeatmapData> {
    const res = await get<ApiSingleResponse<HeatmapData>>('/api/heatmap', { year: String(year) });
    const data = res as any;
    return {
      data: data.data || {},
      stats: data.stats || { totalRecords: 0, totalDays: 0, peakDay: 0 },
      availableYears: data.availableYears || [2026, 2025],
    };
  }
}
