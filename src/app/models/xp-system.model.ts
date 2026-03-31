export interface XpSummary {
  total_xp: number;
  current_level: number;
  level_name: string;
  level_icon: string;
  xp_in_level: number;
  xp_to_next_level: number | null;  // null jika level max (8)
  progress: number;                  // 0.0–1.0
  global_rank: number;
}

export interface XpBreakdown {
  quiz_complete: number;
  correct_answers: number;
  score_bonus: number;
  total: number;
}

export interface XpAwardResult {
  xp_awarded: number;
  total_xp: number;
  leveled_up: boolean;
  new_level: number;
  new_level_name: string;
  new_level_icon: string;
}

export interface LevelInfo {
  level: number;
  name: string;
  icon: string;
  total_xp_required: number;
}

export const LEVEL_CONFIGS: LevelInfo[] = [
  { level: 1, name: 'Pemula',   icon: '🌱', total_xp_required: 0 },
  { level: 2, name: 'Pelajar',  icon: '📖', total_xp_required: 500 },
  { level: 3, name: 'Terampil', icon: '✏️', total_xp_required: 2_000 },
  { level: 4, name: 'Mahir',    icon: '🎯', total_xp_required: 5_000 },
  { level: 5, name: 'Cakap',    icon: '🔥', total_xp_required: 10_000 },
  { level: 6, name: 'Ahli',     icon: '💡', total_xp_required: 20_000 },
  { level: 7, name: 'Master',   icon: '🏆', total_xp_required: 40_000 },
  { level: 8, name: 'Legenda',  icon: '👑', total_xp_required: 80_000 },
];
