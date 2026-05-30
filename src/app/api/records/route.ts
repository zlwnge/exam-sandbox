import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto'; // 🔥 修复：改为标准的强类型 UUID 发生器导入
import fs from 'fs';
import path from 'path';

// helper: save data URL (base64) to public/uploads and return web path
async function saveDataUrlToFile(dataUrl: string, subfolder = ''): Promise<string | null> {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const base64Data = match[3];

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${randomUUID()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // return web-accessible path
    const webPath = `/uploads/${subfolder ? subfolder + '/' : ''}${fileName}`;
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

    let {
      source, subject, question_type, content_text, content_image,
      user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image,
      solutions
    } = json;

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

    // 健壮性防空御盾：确保核心元数据不为空
    if (!source || !subject || !question_type || !content_text) {
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
          if (sol.solution_text && String(sol.solution_text).trim()) { // 仅持久化有实际内容的机构解析行
            const solId = randomUUID();
            insertSolution.run(solId, id, sol.channel_name || '未命名渠道', sol.solution_text, sol.solution_image || null);
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