// Model sesuai backend AFD-128: GET /analytics/score-history

export interface ScoreDataPoint {
  session_id: string;
  paket_soal_id: number | null;
  package_name: string;
  category: string;
  score: number;           // 0–100 integer
  correct: number;
  incorrect: number;
  unanswered: number;
  duration_seconds: number;
  completed_at: string;    // ISO 8601 datetime
}

export interface ScoreSummary {
  average: number;         // f64, 1 desimal
  highest: number;
  lowest: number;
  trend: number;           // positif = naik, negatif = turun
  total_attempts: number;
}

export interface ScoreHistoryResponse {
  data_points: ScoreDataPoint[];
  summary: ScoreSummary;
}

export interface ScoreHistoryQuery {
  days?: number;        // 7 | 30 | 90 | 0 = semua; default 30
  package_id?: number;  // filter per paket
  category?: string;    // filter per kategori
}
