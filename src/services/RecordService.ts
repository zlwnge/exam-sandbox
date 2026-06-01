import { get, post, put, del } from '@/lib/api';
import { StudyRecord, RecordFilter, RecordPayload } from '@/types/record';
import { ApiListResponse, ApiSingleResponse } from '@/types/api';

export class RecordService {
  static async list(filter: RecordFilter = {}): Promise<StudyRecord[]> {
    const params: Record<string, string> = {};
    if (filter.search) params.search = filter.search;
    if (filter.subject) params.subject = filter.subject;
    if (filter.question_type) params.question_type = filter.question_type;
    if (filter.tag) params.tag = filter.tag;
    const res = await get<ApiListResponse<StudyRecord>>('/api/records', params);
    return res.records || [];
  }

  static async create(payload: RecordPayload): Promise<string> {
    const res = await post<ApiSingleResponse<{ recordId: string }>>('/api/records', payload);
    return (res as any).recordId || '';
  }

  static async update(id: string, payload: RecordPayload): Promise<void> {
    await put<ApiSingleResponse<{ id: string }>>('/api/records', { id, ...payload });
  }

  static async delete(id: string): Promise<void> {
    await del<ApiSingleResponse<{ id: string }>>('/api/records', { id });
  }

  static async getQuestionTypes(subject?: string): Promise<string[]> {
    const params: Record<string, string> = {};
    if (subject) params.subject = subject;
    const res = await get<ApiSingleResponse<{ types: string[] }>>('/api/question-types', params);
    return (res as any).types || [];
  }
}
