import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const summary = db.prepare(`
      SELECT 
        subject, COUNT(*) as total_count,
        SUM(CASE WHEN importance >= 4 THEN 1 ELSE 0 END) as core_danger_count,
        AVG(importance) as avg_importance
      FROM study_records GROUP BY subject
    `).all();

    const paths = db.prepare(`
      SELECT 
        subject, tags as knowledge_path, COUNT(*) as record_count,
        ROUND(AVG(importance), 1) as avg_importance,
        SUM(CASE WHEN importance >= 4 THEN 1 ELSE 0 END) as high_risk_count
      FROM study_records GROUP BY subject, tags ORDER BY record_count DESC
    `).all();

    return NextResponse.json({ success: true, summary, paths });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}