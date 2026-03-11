export interface QuizHistoryEntry {
  id: string;
  package_name: string;
  category: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  duration_seconds: number;
  completed_at: string;
}

export interface QuizHistoryResponse {
  data: QuizHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}
