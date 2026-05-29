import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// 使用 Zod .strict() 强行在协议层抹杀一切“结果论（对错、分数）”字段的侵入
const recordSchema = z.object({
  category: z.enum(['行测', '申论', '面试']),
  knowledge_path: z.string().min(1),
  content_text: z.string().min(1),
  image_url: z.string().optional().nullable(),
  my_thinking_path: z.string().optional(),
  core_eye: z.string().optional(),
  mastery_level: z.enum(['未知', '存在盲区', '路径冗长', '完美掌握']),
  duration: z.number().nonnegative().default(0),
  breakdowns: z.array(z.object({
    source_name: z.string().min(1),
    steps: z.string().min(1)
  })).min(1)
}).strict();

// P0: 核心录入控制流 (带 ACID 级联事务)
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsedData = recordSchema.parse(json);

    // 默认本地沙箱多租户隔离用户 ID
    const userId = 'local_admin_2026'; 

    const insertRecord = db.prepare(`
      INSERT INTO study_records (id, user_id, category, knowledge_path, content_text, image_url, my_thinking_path, core_eye, mastery_level, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBreakdown = db.prepare(`
      INSERT INTO methodology_breakdowns (id, record_id, source_name, steps) VALUES (?, ?, ?, ?)
    `);

    const recordId = randomUUID();

    // 严格启用 better-sqlite3 事务保护机制，子表失败则全盘回滚
    const runTransaction = db.transaction((data) => {
      insertRecord.run(
        recordId, userId, data.category, data.knowledge_path, data.content_text,
        data.image_url, data.my_thinking_path, data.core_eye, data.mastery_level, data.duration
      );

      for (const b of data.breakdowns) {
        insertBreakdown.run(randomUUID(), recordId, b.source_name, b.steps);
      }
    });

    runTransaction(parsedData);
    return NextResponse.json({ success: true, recordId }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// P1: 多维条件级联防抖检索接口
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const mastery = searchParams.get('mastery_level') || '';

    let sql = `
      SELECT r.*, b.id as b_id, b.source_name, b.steps 
      FROM study_records r
      LEFT JOIN methodology_breakdowns b ON r.id = b.record_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (r.content_text LIKE ? OR r.knowledge_path LIKE ? OR r.core_eye LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (mastery) {
      sql += ` AND r.mastery_level = ?`;
      params.push(mastery);
    }
    sql += ` ORDER BY r.created_at DESC`;

    const rows = db.prepare(sql).all(...params) as any[];
    
    // 聚合内存数据结构优化输出
    const results: Record<string, any> = {};
    for (const row of rows) {
      if (!results[row.id]) {
        results[row.id] = { ...row, breakdowns: [] };
      }
      if (row.b_id) {
        results[row.id].breakdowns.push({ id: row.b_id, source_name: row.source_name, steps: row.steps });
      }
    }

    return NextResponse.json({ success: true, records: Object.values(results) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}