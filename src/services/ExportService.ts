import { get, post } from '@/lib/api';
import { RecordFilter } from '@/types/record';

export class ExportService {
  static async downloadJson(filter?: RecordFilter): Promise<void> {
    const params = ExportService.buildParams(filter);
    params.set('format', 'json');
    ExportService.triggerDownload(`/api/export?${params.toString()}`, 'records.json');
  }

  static async downloadCsv(filter?: RecordFilter): Promise<void> {
    const params = ExportService.buildParams(filter);
    params.set('format', 'csv');
    ExportService.triggerDownload(`/api/export?${params.toString()}`, 'records.csv');
  }

  static async downloadZip(filter?: RecordFilter): Promise<void> {
    const params = ExportService.buildParams(filter);
    params.set('format', 'zip');
    ExportService.triggerDownload(`/api/export?${params.toString()}`, 'records_backup.zip');
  }

  static async importFile(file: File): Promise<{ inserted: number; skipped: number }> {
    const reader = new FileReader();
    const text = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(file);
    });
    const ct = file.type || (file.name.endsWith('.csv') ? 'text/csv' : 'application/json');
    const headers: Record<string, string> = { 'Content-Type': ct };
    const res = await post<{ success: boolean; inserted: number; skipped: number; error?: string }>(
      '/api/import',
      text
    );
    if (!res.success) throw new Error(res.error || '导入失败');
    return { inserted: res.inserted, skipped: res.skipped };
  }

  private static buildParams(filter?: RecordFilter): URLSearchParams {
    const params = new URLSearchParams();
    if (filter?.subject) params.set('subject', filter.subject);
    if (filter?.question_type) params.set('question_type', filter.question_type);
    if (filter?.tag) params.set('tag', filter.tag);
    return params;
  }

  private static triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
