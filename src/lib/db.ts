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