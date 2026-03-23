export interface QuestionOption {
  key: string;    // 'opt1' | 'opt2' | 'opt3' | 'opt4' | 'opt5'
  text: string;
}

export interface DailyChallengeQuestion {
  id: number;
  question_text: string;
  options: QuestionOption[];
  category: string;
  difficulty: number;
}

export interface UserAttemptResult {
  selected_option: string;
  is_correct: boolean;
  time_taken_ms: number;
  score: number;
  rank: number;
  total_participants: number;
  correct_answer: string;
  explanation: string;
}

export interface DailyChallengeResponse {
  challenge_id: string;
  date: string;                         // 'YYYY-MM-DD'
  question: DailyChallengeQuestion;
  category: string;
  difficulty: number;
  total_attempts: number;
  user_attempt: UserAttemptResult | null;
  resets_in_seconds: number;
  // also support the backend's actual field names
  challenge_date?: string;
  soal?: {
    id: number;
    soal: string;
    opt1: string;
    opt2: string;
    opt3?: string;
    opt4?: string;
    opt5?: string;
    pelajaran?: string;
    tag?: string;
  };
  already_answered?: boolean;
  correct_answer?: string;
}

export interface DailyLeaderboardEntry {
  rank: number;
  display_name: string;
  time_taken_ms: number;
  score: number;
  is_current_user: boolean;
}

export interface DailyLeaderboardResponse {
  challenge_date: string;
  total_participants: number;
  entries: DailyLeaderboardEntry[];
  user_entry?: DailyLeaderboardEntry | null;
}

export interface DailyChallengeStreak {
  current_streak: number;
  longest_streak: number;
  last_answered_date: string | null;
  total_participated: number;
  total_correct: number;
  avg_score?: number;
}

export interface UserChallengeStats {
  current_streak: number;
  longest_streak: number;
  total_attempts: number;
  correct_attempts: number;
  total_score: number;
}

export interface SubmitChallengeRequest {
  selected_answer: number;   // 1-5
  time_taken_ms: number;
}

export interface SubmitChallengeResponse {
  is_correct: boolean;
  correct_answer: number;
  score: number;
  rank: number;
  total_participants: number;
}
