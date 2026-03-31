export type PomodoroPhase = 'idle' | 'focus' | 'short-break' | 'long-break';

export interface PomodoroSettings {
  enabled: boolean;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakAfter: number;
  soundEnabled: boolean;
  browserNotificationEnabled: boolean;
  autoStartBreak: boolean;
  autoStartNextPomodoro: boolean;
}

export interface PomodoroPhaseRecord {
  pomodoroNum: number;
  questionsAnswered: number;
  durationSeconds: number;
}

export interface PomodoroCompletionStats {
  pomodoroEnabled: boolean;
  pomodoroSessions: number;
  pomodoroFocusMinutes: number;
  pomodoroQuestionsAnswered: number;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  enabled: false,
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakAfter: 4,
  soundEnabled: true,
  browserNotificationEnabled: true,
  autoStartBreak: false,
  autoStartNextPomodoro: false,
};

export const POMODORO_PRESETS: Array<{
  k: 'classic' | 'short' | 'long' | 'custom';
  l: string;
  desc: string;
}> = [
  { k: 'classic', l: 'Klasik',  desc: '25 / 5 mnt'  },
  { k: 'short',   l: 'Singkat', desc: '15 / 3 mnt'  },
  { k: 'long',    l: 'Panjang', desc: '50 / 10 mnt' },
  { k: 'custom',  l: 'Custom',  desc: 'Bebas atur'  },
];
