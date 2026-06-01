import { NextResponse } from 'next/server';
// This route reads files from disk and may use request.url; force runtime handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

function fetchAllRecords(filters: any = {}) {
  // basic filter support: subject, question_type, tag
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (filters.subject) { where += ' AND r.subject = ?'; params.push(filters.subject); }
  if (filters.question_type) { where += ' AND r.question_type = ?'; params.push(filters.question_type); }
  if (filters.tag) { where += ' AND r.tags LIKE ?'; params.push(`%${filters.tag}%`); }

  const rows = db.prepare(`
    SELECT r.*, s.id as s_id, s.channel_name, s.solution_text, s.solution_image
    FROM study_records r
    LEFT JOIN channel_solutions s ON r.id = s.record_id
    ${where}
    ORDER BY r.practice_date DESC, r.created_at DESC
  `).all(...params) as any[];

  const map: Record<string, any> = {};
  for (const row of rows) {
    if (!map[row.id]) map[row.id] = { ...row, solutions: [] };
    if (row.s_id) map[row.id].solutions.push({ id: row.s_id, channel_name: row.channel_name, solution_text: row.solution_text, solution_image: row.solution_image || null });
  }
  return Object.values(map);
}

function toCSV(records: any[]) {
  const header = ['id','source','subject','question_type','content_text','content_image','user_answer','user_answer_image','tags','importance','practice_date','review_notes','review_image','solutions_json'];
  const lines = [header.join(',')];
  for (const r of records) {
    const row = [
      r.id,
      `"${(r.source||'').replace(/"/g,'""')}"`,
      `"${(r.subject||'').replace(/"/g,'""')}"`,
      `"${(r.question_type||'').replace(/"/g,'""')}"`,
      `"${(r.content_text||'').replace(/"/g,'""')}"`,
      r.content_image || '',
      `"${(r.user_answer||'').replace(/"/g,'""')}"`,
      r.user_answer_image || '',
      `"${(r.tags||'').replace(/"/g,'""')}"`,
      r.importance || '',
      r.practice_date || '',
      `"${(r.review_notes||'').replace(/"/g,'""')}"`,
      r.review_image || '',
      `"${JSON.stringify(r.solutions || []).replace(/"/g,'""')}"`
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

    const records = fetchAllRecords({ subject, question_type, tag });

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
