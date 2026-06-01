import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto'; // 🔥 修复：改为标准的强类型 UUID 发生器导入
import fs from 'fs';
import path from 'path';

// ---- Types & normalization helpers ----
interface SolutionPayload {
  id?: string;
  channel_name?: unknown;
  solution_text?: unknown;
  solution_image?: unknown;
}

interface RecordPayload {
  id?: string;
  source?: unknown;
  subject?: unknown;
  question_type?: unknown;
  content_text?: unknown;
  content_image?: unknown;
  user_answer?: unknown;
  user_answer_image?: unknown;
  tags?: unknown;
  importance?: unknown;
  practice_date?: unknown;
  review_notes?: unknown;
  review_image?: unknown;
  solutions?: SolutionPayload[];
}

interface NormalizedSolution {
  id?: string;
  channel_name: string;
  solution_text: string;
  solution_image: string | null;
}

interface NormalizedRecord {
  id?: string;
  source: string;
  subject: string;
  question_type: string;
  content_text: string;
  content_image: string | null;
  user_answer: string;
  user_answer_image: string | null;
  tags: string;
  importance: number;
  practice_date: string;
  review_notes: string;
  review_image: string | null;
  solutions: NormalizedSolution[];
}

function toStr(v: unknown) {
  if (v === undefined || v === null) return '';
  return String(v);
}

function normalizeRecordPayload(input: RecordPayload): NormalizedRecord {
  const solIn = Array.isArray(input.solutions) ? input.solutions : [];
  const solutions: NormalizedSolution[] = solIn.map((s: SolutionPayload) => ({
    id: s?.id,
    channel_name: toStr(s?.channel_name) || '未命名渠道',
    solution_text: toStr(s?.solution_text) || '',
    solution_image: s?.solution_image && typeof s.solution_image === 'string' ? s.solution_image : null
  }));

  const today = new Date().toISOString().split('T')[0];

  return {
    id: input.id,
    source: toStr(input.source),
    subject: toStr(input.subject),
    question_type: toStr(input.question_type),
    content_text: toStr(input.content_text),
    content_image: input.content_image && typeof input.content_image === 'string' ? input.content_image : null,
    user_answer: toStr(input.user_answer),
    user_answer_image: input.user_answer_image && typeof input.user_answer_image === 'string' ? input.user_answer_image : null,
    tags: toStr(input.tags),
    importance: Number(input.importance) || 3,
    practice_date: toStr(input.practice_date) || today,
    review_notes: toStr(input.review_notes),
    review_image: input.review_image && typeof input.review_image === 'string' ? input.review_image : null,
    solutions
  };
}


// helper: save data URL (base64) to public/uploads and return web path
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

    // return API-accessible path
    const webPath = `/api/uploads/${subfolder ? subfolder + '/' : ''}${fileName}`;
    return webPath;
  } catch (err) {
    console.error('saveDataUrlToFile error', err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const recordId = randomUUID(); // 生成主记录的唯一物理主键

    const normalized = normalizeRecordPayload(json as RecordPayload);
    let { source, subject, question_type, content_text, content_image,
      user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image,
      solutions } = normalized;

    // 如果有 data URL 图片，保存到文件系统并替换为文件路径
    const todayFolder = new Date().toISOString().slice(0,10).replace(/-/g, '');
    if (content_image && typeof content_image === 'string' && content_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(content_image, todayFolder);
      if (saved) content_image = saved;
    }
    if (review_image && typeof review_image === 'string' && review_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(review_image, todayFolder);
      if (saved) review_image = saved;
    }
    if (user_answer_image && typeof user_answer_image === 'string' && user_answer_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(user_answer_image, todayFolder);
      if (saved) user_answer_image = saved;
    }
    if (Array.isArray(solutions)) {
      for (const sol of solutions) {
        if (sol && sol.solution_image && typeof sol.solution_image === 'string' && sol.solution_image.startsWith('data:')) {
          const saved = await saveDataUrlToFile(sol.solution_image, todayFolder);
          if (saved) sol.solution_image = saved;
        }
      }
    }

    // 健壮性防空御盾：确保核心元数据不为空。允许以图片替代文本（content_text 可由 content_image 替代）
    if (!source || !subject || !question_type || (!content_text && !content_image)) {
      return NextResponse.json({ success: false, error: '必填基础档案元数据不完整' }, { status: 400 });
    }

    const insertRecord = db.prepare(`
      INSERT INTO study_records (id, source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSolution = db.prepare(`
      INSERT INTO channel_solutions (id, record_id, channel_name, solution_text, solution_image)
      VALUES (?, ?, ?, ?, ?)
    `);

    // 强隔离 ACID 级联事务
    const runTx = db.transaction((id: string, data: any) => {
      insertRecord.run(
        id, data.source, data.subject, data.question_type, data.content_text,
        data.content_image, data.user_answer, data.user_answer_image, data.tags, Number(data.importance),
        data.practice_date, data.review_notes, data.review_image
      );
      
      if (Array.isArray(data.solutions)) {
        for (const sol of data.solutions) {
          const txt = sol.solution_text ? String(sol.solution_text).trim() : '';
          const hasImage = !!sol.solution_image;
          if (txt || hasImage) { // 持久化有文本或有图片的解析行
            const solId = randomUUID();
            insertSolution.run(solId, id, sol.channel_name || '未命名渠道', sol.solution_text || '', sol.solution_image || null);
          }
        }
      }
    });

    runTx(recordId, { source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image, solutions });

    return NextResponse.json({ success: true, recordId }, { status: 201 });
  } catch (error: any) {
    console.error('🔥 物理层级联写入事务崩溃，原因:', error.message); // 打印到本地终端
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const subject = searchParams.get('subject') || '';
    const qType = searchParams.get('question_type') || '';

    let query = `
      SELECT r.*, s.id as s_id, s.channel_name, s.solution_text, s.solution_image
      FROM study_records r
      LEFT JOIN channel_solutions s ON r.id = s.record_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (r.content_text LIKE ? OR r.source LIKE ? OR r.tags LIKE ? OR r.review_notes LIKE ?)`;
      const wildcard = `%${search}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }
    if (subject) {
      query += ` AND r.subject = ?`;
      params.push(subject);
    }
    if (qType) {
      query += ` AND r.question_type = ?`;
      params.push(qType);
    }
    const tag = searchParams.get('tag') || '';
    if (tag) {
      query += ` AND r.tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    query += ` ORDER BY r.practice_date DESC, r.created_at DESC`;
    const rows = db.prepare(query).all(...params) as any[];

    const recordsMap: Record<string, any> = {};
    for (const row of rows) {
      if (!recordsMap[row.id]) {
        recordsMap[row.id] = { ...row, solutions: [] };
      }
      if (row.s_id) {
        recordsMap[row.id].solutions.push({
          id: row.s_id,
          channel_name: row.channel_name,
          solution_text: row.solution_text,
          solution_image: row.solution_image || null
        });
      }
    }

    return NextResponse.json({ success: true, records: Object.values(recordsMap) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const incoming = json as RecordPayload;
    const { id } = incoming;
    if (!id) return NextResponse.json({ success: false, error: '缺少记录 id' }, { status: 400 });

    const normalized = normalizeRecordPayload(incoming);
    let { source, subject, question_type, content_text, content_image,
      user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image,
      solutions } = normalized;

    const todayFolder = new Date().toISOString().slice(0,10).replace(/-/g, '');
    if (content_image && typeof content_image === 'string' && content_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(content_image, todayFolder);
      if (saved) content_image = saved;
    }
    if (review_image && typeof review_image === 'string' && review_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(review_image, todayFolder);
      if (saved) review_image = saved;
    }
    if (user_answer_image && typeof user_answer_image === 'string' && user_answer_image.startsWith('data:')) {
      const saved = await saveDataUrlToFile(user_answer_image, todayFolder);
      if (saved) user_answer_image = saved;
    }
    if (Array.isArray(solutions)) {
      for (const sol of solutions) {
        if (sol && sol.solution_image && typeof sol.solution_image === 'string' && sol.solution_image.startsWith('data:')) {
          const saved = await saveDataUrlToFile(sol.solution_image, todayFolder);
          if (saved) sol.solution_image = saved;
        }
      }
    }

    // 允许 image 替代文本
    if (!source || !subject || !question_type || (!content_text && !content_image)) {
      return NextResponse.json({ success: false, error: '必填基础档案元数据不完整' }, { status: 400 });
    }

    // 归一化为非空字符串以满足 DB NOT NULL 约束
    content_text = content_text || '';
    user_answer = user_answer || '';
    review_notes = review_notes || '';
    tags = tags || '';

    const updateRecord = db.prepare(`
      UPDATE study_records SET source = ?, subject = ?, question_type = ?, content_text = ?, content_image = ?, user_answer = ?, user_answer_image = ?, tags = ?, importance = ?, practice_date = ?, review_notes = ?, review_image = ? WHERE id = ?
    `);

    const deleteSolutions = db.prepare(`DELETE FROM channel_solutions WHERE record_id = ?`);
    const insertSolution = db.prepare(`
      INSERT INTO channel_solutions (id, record_id, channel_name, solution_text, solution_image)
      VALUES (?, ?, ?, ?, ?)
    `);

    const runTx = db.transaction((rid: string, data: any) => {
      updateRecord.run(
        data.source, data.subject, data.question_type, data.content_text, data.content_image,
        data.user_answer, data.user_answer_image, data.tags, Number(data.importance), data.practice_date,
        data.review_notes, data.review_image, rid
      );

      deleteSolutions.run(rid);

      if (Array.isArray(data.solutions)) {
        for (const sol of data.solutions) {
          const txt = sol.solution_text ? String(sol.solution_text).trim() : '';
          const hasImage = !!sol.solution_image;
          if (txt || hasImage) {
            const solId = randomUUID();
            insertSolution.run(solId, rid, sol.channel_name || '未命名渠道', sol.solution_text || '', sol.solution_image || null);
          }
        }
      }
    });

    runTx(id, { source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image, solutions });

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: any) {
    console.error('PUT /api/records error', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // 支持通过 body.json() 提供 { id }
    let id: string | null = null;
    try {
      const payload = await request.json();
      id = payload?.id || null;
    } catch (e) {
      // 如果没有 body，尝试从 query param 获取
      const url = new URL(request.url);
      id = url.searchParams.get('id');
    }

    if (!id) return NextResponse.json({ success: false, error: '缺少记录 id' }, { status: 400 });

    const del = db.prepare(`DELETE FROM study_records WHERE id = ?`);
    const info = del.run(id);

    if (info.changes && info.changes > 0) {
      return NextResponse.json({ success: true, id });
    } else {
      return NextResponse.json({ success: false, error: '未找到该记录' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('DELETE /api/records error', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}