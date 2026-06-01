import { NextResponse } from 'next/server';
import { db, fetchRecordsWithSolutions } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// POST: 录入新题目记录（使用实际的 study_records + channel_solutions schema）
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      source = '',
      subject = '',
      question_type = '',
      content_text = '',
      content_image = null,
      user_answer = '',
      user_answer_image = null,
      tags = '',
      importance = 3,
      practice_date = new Date().toISOString().split('T')[0],
      review_notes = '',
      review_image = null,
      solutions = []
    } = json;

    if (!source || !subject || !question_type || (!content_text && !content_image)) {
      return NextResponse.json({ success: false, error: '必填基础档案元数据不完整' }, { status: 400 });
    }

    const recordId = randomUUID();

    const insertRecord = db.prepare(`
      INSERT INTO study_records (id, source, subject, question_type, content_text, content_image, user_answer, user_answer_image, tags, importance, practice_date, review_notes, review_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertSolution = db.prepare(`
      INSERT INTO channel_solutions (id, record_id, channel_name, solution_text, solution_image)
      VALUES (?, ?, ?, ?, ?)
    `);

    const runTx = db.transaction(() => {
      insertRecord.run(recordId, source, subject, question_type, content_text, content_image,
        user_answer, user_answer_image, tags, Number(importance), practice_date, review_notes, review_image);

      if (Array.isArray(solutions)) {
        for (const sol of solutions) {
          const txt = (sol.solution_text || '').toString().trim();
          const hasImage = !!sol.solution_image;
          if (txt || hasImage) {
            insertSolution.run(randomUUID(), recordId,
              sol.channel_name || '未命名渠道',
              sol.solution_text || '',
              sol.solution_image || null);
          }
        }
      }
    });

    runTx();
    return NextResponse.json({ success: true, recordId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

// GET: 多维条件检索（复用共享查询函数）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const records = fetchRecordsWithSolutions({
      search: searchParams.get('search') || '',
      subject: searchParams.get('subject') || '',
      question_type: searchParams.get('question_type') || '',
      tag: searchParams.get('tag') || ''
    });
    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
