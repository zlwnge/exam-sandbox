export interface SolutionRow {
  id?: string;
  channel_name: string;
  solution_text: string;
  solution_image: string | null;
}

export interface StudyRecord {
  id: string;
  source: string;
  subject: string;
  question_type: string;
  content_text: string;
  content_image: string | null;
  user_answer: string;
  user_answer_image?: string | null;
  tags: string;
  importance: number;
  practice_date: string;
  review_notes: string;
  review_image: string | null;
  created_at: string;
  solutions: SolutionRow[];
}

export interface RecordFilter {
  search?: string;
  subject?: string;
  question_type?: string;
  tag?: string;
  autoRun?: boolean;
}

export interface RecordPayload {
  source: string;
  subject: string;
  question_type: string;
  content_text: string;
  content_image: string | null;
  user_answer: string;
  user_answer_image?: string | null;
  tags: string;
  importance: number;
  practice_date: string;
  review_notes: string;
  review_image: string | null;
  solutions: SolutionRow[];
}
