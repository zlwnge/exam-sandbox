import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') || '';
    
    let rows: any[];
    if (subject) {
      // 聚合检索当前指定科目下的所有历史题型
      rows = db.prepare(`
        SELECT DISTINCT question_type 
        FROM study_records 
        WHERE subject = ? 
        ORDER BY question_type ASC
      `).all(subject) as any[];
    } else {
      rows = db.prepare(`
        SELECT DISTINCT question_type 
        FROM study_records 
        ORDER BY question_type ASC
      `).all() as any[];
    }
    
    const types = rows.map(r => r.question_type);
    return NextResponse.json({ success: true, types });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}