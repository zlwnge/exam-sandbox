import Database from 'better-sqlite3';
import path from 'path';

// 将 SQLite 文件持久化至项目根目录，100% 物理隔离
const dbPath = path.join(process.cwd(), 'civil_service_sandbox.db');
export const db = new Database(dbPath);

// 自动浇筑符合持久化要求的多渠道 1:N 级联关联关系表结构
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS study_records (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    subject TEXT NOT NULL,
    question_type TEXT NOT NULL,
    content_text TEXT NOT NULL,
    content_image TEXT,
    user_answer_image TEXT,
    user_answer TEXT NOT NULL,
    tags TEXT NOT NULL,
    importance INTEGER NOT NULL,
    practice_date TEXT NOT NULL,
    review_notes TEXT NOT NULL,
    review_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS channel_solutions (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    solution_text TEXT NOT NULL,
    solution_image TEXT,
    FOREIGN KEY(record_id) REFERENCES study_records(id) ON DELETE CASCADE
  );
`);

// If tables existed previously, ensure new optional columns exist (safe migration)
try {
  const infoRec = db.prepare(`PRAGMA table_info(study_records)`).all();
  const hasUserAnswerImage = infoRec.some((c: any) => c.name === 'user_answer_image');
  if (!hasUserAnswerImage) {
    db.exec(`ALTER TABLE study_records ADD COLUMN user_answer_image TEXT;`);
  }

  const infoSol = db.prepare(`PRAGMA table_info(channel_solutions)`).all();
  const hasSolutionImage = infoSol.some((c: any) => c.name === 'solution_image');
  if (!hasSolutionImage) {
    db.exec(`ALTER TABLE channel_solutions ADD COLUMN solution_image TEXT;`);
  }
} catch (err) {
  console.warn('DB migration warning:', err);
}

// 创建索引以提升按日期/科目/题型/标签的查询性能
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_study_records_practice_date ON study_records(practice_date);
    CREATE INDEX IF NOT EXISTS idx_study_records_subject ON study_records(subject);
    CREATE INDEX IF NOT EXISTS idx_study_records_question_type ON study_records(question_type);
    CREATE INDEX IF NOT EXISTS idx_study_records_tags ON study_records(tags);
    -- 复合索引提高按科目+题型联合筛选效率
    CREATE INDEX IF NOT EXISTS idx_study_records_subject_qtype ON study_records(subject, question_type);
  `);
} catch (err) {
  console.warn('DB index creation warning:', err);
}

// ---- Shared query: fetch records with their channel_solutions joined ----

export interface RecordsFilter {
  search?: string;
  subject?: string;
  question_type?: string;
  tag?: string;
}

/**
 * Fetch study_records with their channel_solutions aggregated as an array.
 * All filter fields are optional; when empty, returns all records.
 */
export function fetchRecordsWithSolutions(filter: RecordsFilter = {}) {
  let sql = `
    SELECT r.*, s.id as s_id, s.channel_name, s.solution_text, s.solution_image
    FROM study_records r
    LEFT JOIN channel_solutions s ON r.id = s.record_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter.search) {
    sql += ` AND (r.content_text LIKE ? OR r.source LIKE ? OR r.tags LIKE ? OR r.review_notes LIKE ?)`;
    const wildcard = `%${filter.search}%`;
    params.push(wildcard, wildcard, wildcard, wildcard);
  }
  if (filter.subject) {
    sql += ` AND r.subject = ?`;
    params.push(filter.subject);
  }
  if (filter.question_type) {
    sql += ` AND r.question_type = ?`;
    params.push(filter.question_type);
  }
  if (filter.tag) {
    sql += ` AND r.tags LIKE ?`;
    params.push(`%${filter.tag}%`);
  }

  sql += ` ORDER BY r.practice_date DESC, r.created_at DESC`;

  const rows = db.prepare(sql).all(...params) as any[];

  // Aggregate solutions into array per record
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

  return Object.values(recordsMap);
}