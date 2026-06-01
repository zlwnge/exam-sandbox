import { NextResponse } from 'next/server';
// This route reads files from disk and may use request.url; force runtime handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { fetchRecordsWithSolutions } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

/** Escape a value for CSV: wrap in quotes, escape internal quotes and newlines. */
function csvEscape(val: string): string {
  // Replace newlines with space to keep CSV rows intact
  const safe = val.replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${safe}"`;
}

function toCSV(records: any[]) {
  const header = ['id','source','subject','question_type','content_text','content_image','user_answer','user_answer_image','tags','importance','practice_date','review_notes','review_image','solutions_json'];
  const lines = [header.join(',')];
  for (const r of records) {
    const row = [
      r.id,
      csvEscape(r.source || ''),
      csvEscape(r.subject || ''),
      csvEscape(r.question_type || ''),
      csvEscape(r.content_text || ''),
      r.content_image || '',
      csvEscape(r.user_answer || ''),
      r.user_answer_image || '',
      csvEscape(r.tags || ''),
      r.importance || '',
      r.practice_date || '',
      csvEscape(r.review_notes || ''),
      r.review_image || '',
      csvEscape(JSON.stringify(r.solutions || []))
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json').toLowerCase();
    const subject = url.searchParams.get('subject') || '';
    const question_type = url.searchParams.get('question_type') || '';
    const tag = url.searchParams.get('tag') || '';

    const records = fetchRecordsWithSolutions({ subject, question_type, tag });

    if (format === 'csv') {
      const csv = toCSV(records);
      return new NextResponse(csv, { status: 200, headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="records.csv"' } });
    }

    if (format === 'zip') {
      const zip = new AdmZip();
      // add json
      zip.addFile('records.json', Buffer.from(JSON.stringify(records, null, 2), 'utf-8'));
      // add images referenced
      const added = new Set<string>();
      for (const r of records) {
        const imgs = [r.content_image, r.user_answer_image, r.review_image];
        for (const s of r.solutions || []) imgs.push(s.solution_image);
        for (const img of imgs) {
          if (!img || typeof img !== 'string') continue;
          let full: string | null = null;
          // support new API-backed /api/uploads/ paths and legacy /uploads/ paths
          if (img.startsWith('/api/uploads/')) {
            const rel = img.replace(/^\/api\/uploads\/?/, '');
            full = path.join(process.cwd(), 'uploads', rel.replace(/\//g, path.sep));
          } else if (img.startsWith('/uploads/')) {
            const rel = img.replace(/^\/?|^\//, '');
            // legacy: map to project-root uploads (not public)
            full = path.join(process.cwd(), 'uploads', rel.replace(/\//g, path.sep));
          }
          if (full && fs.existsSync(full) && !added.has(full)) {
            zip.addLocalFile(full, 'uploads', path.basename(full));
            added.add(full);
          }
        }
      }
      const data = zip.toBuffer();
      return new NextResponse(data, { status: 200, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="records_backup.zip"' } });
    }

    // default JSON
    return NextResponse.json({ success: true, records });
  } catch (err: any) {
    console.error('export error', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
