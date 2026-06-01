import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

// Reuse saveDataUrlToFile from records route by reimplementing minimal logic here
async function saveDataUrlToFile(dataUrl: string, subfolder = ''): Promise<string | null> {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const base64Data = match[3];

    const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${randomUUID()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const webPath = `/api/uploads/${subfolder ? subfolder + '/' : ''}${fileName}`;
    return webPath;
  } catch (err) {
    console.error('saveDataUrlToFile error', err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await request.json();
      const items = Array.isArray(json) ? json : (json.records || []);
      if (!Array.isArray(items)) return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });

      const today = new Date().toISOString().slice(0,10).replace(/-/g,'');

      const insertRecord = db.prepare(`INSERT INTO study_records (id, source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertSolution = db.prepare(`INSERT INTO channel_solutions (id, record_id, channel_name, solution_text, solution_image) VALUES (?, ?, ?, ?, ?)`);

      const runTx = db.transaction((rec: any) => {
        // If id provided and already exists, caller wants to skip duplicates
        let idToUse: string;
        if (rec.id) {
          const exists = db.prepare(`SELECT id FROM study_records WHERE id = ?`).get(rec.id);
          if (exists) {
            // signal skip by throwing a special marker (transaction will be aborted but we'll handle per-item below)
            throw new Error('SKIP_EXISTING_ID');
          }
          idToUse = rec.id;
        } else {
          idToUse = randomUUID();
        }

        insertRecord.run(idToUse, rec.source || '', rec.subject || '', rec.question_type || '', rec.content_text || '', rec.content_image || null, rec.user_answer || '', rec.user_answer_image || null, rec.tags || '', Number(rec.importance) || 3, rec.practice_date || '', rec.review_notes || '', rec.review_image || null);
        if (Array.isArray(rec.solutions)) {
          for (const s of rec.solutions) {
            const txt = s.solution_text ? String(s.solution_text).trim() : '';
            const hasImage = !!s.solution_image;
            if (txt || hasImage) {
              const sid = randomUUID();
              insertSolution.run(sid, idToUse, s.channel_name || '未命名渠道', s.solution_text || '', s.solution_image || null);
            }
          }
        }
      });

      let inserted = 0;
      let skipped = 0;
      for (const it of items) {
        // save images if data URLs
        if (it.content_image && typeof it.content_image === 'string' && it.content_image.startsWith('data:')) {
          const saved = await saveDataUrlToFile(it.content_image, today);
          if (saved) it.content_image = saved;
        }
        if (it.review_image && typeof it.review_image === 'string' && it.review_image.startsWith('data:')) {
          const saved = await saveDataUrlToFile(it.review_image, today);
          if (saved) it.review_image = saved;
        }
        if (it.user_answer_image && typeof it.user_answer_image === 'string' && it.user_answer_image.startsWith('data:')) {
          const saved = await saveDataUrlToFile(it.user_answer_image, today);
          if (saved) it.user_answer_image = saved;
        }
        if (Array.isArray(it.solutions)) {
          for (const s of it.solutions) {
            if (s && s.solution_image && typeof s.solution_image === 'string' && s.solution_image.startsWith('data:')) {
              const saved = await saveDataUrlToFile(s.solution_image, today);
              if (saved) s.solution_image = saved;
            }
          }
        }
        try {
          runTx(it);
          inserted++;
        } catch (err: any) {
          if (err && String(err.message) === 'SKIP_EXISTING_ID') {
            skipped++;
            continue;
          }
          throw err;
        }
      }

      return NextResponse.json({ success: true, inserted, skipped });
    }

    // CSV import (simple) - read text
    if (ct.includes('text/csv') || ct.includes('application/csv')) {
      const text = await request.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines.shift()?.split(',').map(h => h.trim()) || [];
      const records: any[] = [];
      for (const ln of lines) {
        // naive CSV split - assumes no commas inside quoted fields
        const cols = ln.split(',');
        const obj: any = {};
        header.forEach((h, i) => obj[h] = cols[i] ? cols[i].replace(/^"|"$/g,'') : '');
        // parse solutions_json if present
        if (obj['solutions_json']) {
          try { obj.solutions = JSON.parse(obj['solutions_json']); } catch(e) { obj.solutions = []; }
        }
        records.push(obj);
      }

      // reuse JSON path
      const body = new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(records) } as any);
      // call recursively? instead just insert directly
      let inserted2 = 0;
      let skipped2 = 0;
      for (const it of records) {
        // similar insert as above (simplified)
        const insertRecord = db.prepare(`INSERT INTO study_records (id, source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const insertSolution = db.prepare(`INSERT INTO channel_solutions (id, record_id, channel_name, solution_text, solution_image) VALUES (?, ?, ?, ?, ?)`);
        // If id provided and exists, skip
        let idToUse = it.id;
        if (idToUse) {
          const exists = db.prepare(`SELECT id FROM study_records WHERE id = ?`).get(idToUse);
          if (exists) {
            skipped2++;
            continue;
          }
        } else {
          idToUse = randomUUID();
        }

        insertRecord.run(idToUse, it.source || '', it.subject || '', it.question_type || '', it.content_text || '', it.content_image || null, it.user_answer || '', it.user_answer_image || null, it.tags || '', Number(it.importance) || 3, it.practice_date || '', it.review_notes || '', it.review_image || null);
        if (Array.isArray(it.solutions)) {
          for (const s of it.solutions) {
            const sid = randomUUID();
            insertSolution.run(sid, idToUse, s.channel_name || '未命名渠道', s.solution_text || '', s.solution_image || null);
          }
        }
        inserted2++;
      }

      return NextResponse.json({ success: true, inserted: inserted2, skipped: skipped2 });
    }

    return NextResponse.json({ success: false, error: 'Unsupported Content-Type, send application/json or text/csv' }, { status: 400 });
  } catch (err: any) {
    console.error('import error', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
