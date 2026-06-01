import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Build hierarchical mapping: subject -> types -> knowledge(tags)
    const subjectsRows = db.prepare(`
      SELECT subject, COUNT(*) as cnt
      FROM study_records
      GROUP BY subject
      ORDER BY cnt DESC
    `).all() as { subject: string; cnt: number }[];

    const hierarchy: any[] = [];
    for (const s of subjectsRows) {
      const typesRows = db.prepare(`
        SELECT question_type, COUNT(*) as cnt
        FROM study_records
        WHERE subject = ?
        GROUP BY question_type
        ORDER BY cnt DESC
      `).all(s.subject) as { question_type: string; cnt: number }[];

      const typesWithKnowledge: any[] = [];
      for (const t of typesRows) {
        // collect tags for this subject+type
        const tagRows = db.prepare(`SELECT tags FROM study_records WHERE subject = ? AND question_type = ? AND tags IS NOT NULL AND tags != ''`).all(s.subject, t.question_type) as { tags: string }[];
        const tagMap: Record<string, number> = {};
        for (const r of tagRows) {
          const parts = r.tags.split(/[,，、]/).map(x => x.trim()).filter(Boolean);
          for (const p of parts) {
            tagMap[p] = (tagMap[p] || 0) + 1;
          }
        }
        const knowledge = Object.keys(tagMap).map(k => ({ tag: k, cnt: tagMap[k] })).sort((a, b) => b.cnt - a.cnt);

        typesWithKnowledge.push({ question_type: t.question_type, cnt: t.cnt, knowledge });
      }

      hierarchy.push({ subject: s.subject, cnt: s.cnt, types: typesWithKnowledge });
    }

    return NextResponse.json({ success: true, hierarchy });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
