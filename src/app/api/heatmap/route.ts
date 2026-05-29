import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // 默认锚定当前系统时间 2026 年
    const year = searchParams.get('year') || '2026';

    // 1. 高性能过滤：提取指定年份的每日错题归档频次
    const rows = db.prepare(`
      SELECT practice_date, COUNT(*) as count 
      FROM study_records 
      WHERE practice_date LIKE ?
      GROUP BY practice_date
    `).all(`${year}-%`) as { practice_date: string; count: number }[];

    const heatmapMap: Record<string, number> = {};
    rows.forEach(row => {
      heatmapMap[row.practice_date] = row.count;
    });

    // 2. 看板动态统计：仅统计切换后的选定年份指标
    const totalRecords = db.prepare(`SELECT COUNT(*) as total FROM study_records WHERE practice_date LIKE ?`).get(`${year}-%`) as { total: number };
    const totalDays = db.prepare(`SELECT COUNT(DISTINCT practice_date) as days FROM study_records WHERE practice_date LIKE ?`).get(`${year}-%`) as { days: number };
    const maxDayCount = db.prepare(`
      SELECT MAX(cnt) as max_cnt FROM (
        SELECT COUNT(*) as cnt FROM study_records WHERE practice_date LIKE ? GROUP BY practice_date
      )
    `).get(`${year}-%`) as { max_cnt: number };

    // 3. 智能年份发现：自动解析数据库中已存在的所有历史年份供前端下拉列表选择
    const yearsRow = db.prepare(`
      SELECT DISTINCT strftime('%Y', practice_date) as yr 
      FROM study_records 
      WHERE practice_date IS NOT NULL AND practice_date != ''
      ORDER BY yr DESC
    `).all() as { yr: string }[];
    
    let availableYears = yearsRow.map(y => parseInt(y.yr)).filter(Boolean);
    
    // 兜底保护：若为空白数据库，确保渲染 2026 及 2025 年
    if (!availableYears.includes(2026)) availableYears.push(2026);
    if (!availableYears.includes(2025)) availableYears.push(2025);
    availableYears = Array.from(new Set(availableYears)).sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      data: heatmapMap,
      stats: {
        totalRecords: totalRecords?.total || 0,
        totalDays: totalDays?.days || 0,
        peakDay: maxDayCount?.max_cnt || 0
      },
      availableYears
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}