import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  PomodoroPhase,
  PomodoroSettings,
  PomodoroPhaseRecord,
  PomodoroCompletionStats,
  DEFAULT_POMODORO_SETTINGS,
} from '../models/pomodoro.model';

// Re-export types for backward compatibility with existing consumers
export type { PomodoroPhase, PomodoroSettings, PomodoroPhaseRecord };
export const DEFAULT_SETTINGS = DEFAULT_POMODORO_SETTINGS;

const STORAGE_KEY = 'pomodoroSettings';
const SESSION_STATS_KEY = 'pomodoroSessionStats';

@Injectable({ providedIn: 'root' })
export class PomodoroService implements OnDestroy {
  constructor(private ngZone: NgZone) {}

  readonly phase$ = new BehaviorSubject<PomodoroPhase>('idle');
  readonly timeLeft$ = new BehaviorSubject<number>(0);
  readonly totalPhaseTime$ = new BehaviorSubject<number>(0);
  readonly pomodoroCount$ = new BehaviorSubject<number>(0);  // completed pomodoros
  readonly settings$ = new BehaviorSubject<PomodoroSettings>(this.loadSettings());

  /** Emitted when a focus phase ends — caller should show the break modal */
  readonly focusComplete$ = new Subject<{ isLong: boolean; count: number }>();
  /** Emitted when a break phase ends — caller should show "start next" UI */
  readonly breakComplete$ = new Subject<void>();

  private timerHandle?: ReturnType<typeof setInterval>;
  private phaseStartTime: number = 0;  // Date.now() for drift correction
  private phaseStartSeconds: number = 0;
  /** Questions answered in current focus phase (set by QuestionComponent) */
  private questionsInPhase: number = 0;
  private phaseRecords: PomodoroPhaseRecord[] = [];

  get settings(): PomodoroSettings {
    return this.settings$.value;
  }

  get phase(): PomodoroPhase {
    return this.phase$.value;
  }

  get isActive(): boolean {
    return this.phase$.value !== 'idle';
  }

  get isOnBreak(): boolean {
    const p = this.phase$.value;
    return p === 'short-break' || p === 'long-break';
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  updateSettings(patch: Partial<PomodoroSettings>): void {
    const next = { ...this.settings$.value, ...patch };
    this.settings$.next(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private loadSettings(): PomodoroSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Start fresh focus session */
  start(): void {
    this.phaseRecords = [];
    this.pomodoroCount$.next(0);
    this.questionsInPhase = 0;
    this.clearSessionStats();
    this.enterFocus();
    this.requestNotificationPermission();
  }

  /** Called by QuestionComponent each time a question is answered */
  recordAnswer(): void {
    this.questionsInPhase++;
  }

  /** Skip the current phase (focus or break) */
  skip(): void {
    this.onPhaseComplete();
  }

  /** Begin the break timer (called after user clicks "Mulai Istirahat") */
  startBreak(): void {
    const s = this.settings$.value;
    const count = this.pomodoroCount$.value;
    const isLong = count > 0 && count % s.longBreakAfter === 0;
    const duration = isLong ? s.longBreakDuration : s.shortBreakDuration;
    this.phase$.next(isLong ? 'long-break' : 'short-break');
    this.startCounting(duration * 60);
  }

  /** Resume the next focus phase (called after break) */
  startNextFocus(): void {
    this.questionsInPhase = 0;
    this.enterFocus();
  }

  pause(): void { this.stopTimer(); }
  resume(): void { this.startCounting(this.timeLeft$.value); }

  stop(): void {
    this.stopTimer();
    this.phase$.next('idle');
    this.pomodoroCount$.next(0);
    this.questionsInPhase = 0;
    this.phaseRecords = [];
    this.clearSessionStats();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private enterFocus(): void {
    const duration = this.settings$.value.focusDuration;
    this.phase$.next('focus');
    this.startCounting(duration * 60);
    this.playSound('focus-start');
  }

  private startCounting(seconds: number): void {
    this.stopTimer();
    this.phaseStartTime = Date.now();
    this.phaseStartSeconds = seconds;
    this.timeLeft$.next(seconds);
    this.totalPhaseTime$.next(seconds);

    // Run timer outside Angular zone to avoid triggering change detection on every tick
    this.ngZone.runOutsideAngular(() => {
      this.timerHandle = setInterval(() => {
        // Drift-correct using wall clock
        const elapsed = Math.floor((Date.now() - this.phaseStartTime) / 1000);
        const remaining = Math.max(0, this.phaseStartSeconds - elapsed);

        // Push back into zone only when state changes
        this.ngZone.run(() => {
          this.timeLeft$.next(remaining);

          // Warn at 5 min left during focus
          if (this.phase$.value === 'focus' && remaining === 5 * 60) {
            this.playSound('warning');
          }

          if (remaining === 0) {
            this.onPhaseComplete();
          }
        });
      }, 500); // poll every 500ms for responsiveness
    });
  }

  private stopTimer(): void {
    if (this.timerHandle !== undefined) {
      clearInterval(this.timerHandle);
      this.timerHandle = undefined;
    }
  }

  private onPhaseComplete(): void {
    this.stopTimer();
    const phase = this.phase$.value;

    if (phase === 'focus') {
      const count = this.pomodoroCount$.value + 1;
      this.pomodoroCount$.next(count);
      this.playSound('phase-complete');

      // Record this focus phase
      const record: PomodoroPhaseRecord = {
        pomodoroNum: count,
        questionsAnswered: this.questionsInPhase,
        durationSeconds: this.settings$.value.focusDuration * 60,
      };
      this.phaseRecords.push(record);
      this.saveSessionStats();

      const s = this.settings$.value;
      const isLong = count % s.longBreakAfter === 0;
      this.phase$.next('idle'); // transitional — widget shows modal
      this.focusComplete$.next({ isLong, count });

      if (s.autoStartBreak) {
        setTimeout(() => this.startBreak(), 500);
      }
    } else {
      // break ended
      this.playSound('break-complete');
      this.sendBrowserNotification();
      this.phase$.next('idle');
      this.breakComplete$.next();

      if (this.settings$.value.autoStartNextPomodoro) {
        setTimeout(() => this.startNextFocus(), 500);
      }
    }
  }

  private saveSessionStats(): void {
    localStorage.setItem(SESSION_STATS_KEY, JSON.stringify(this.phaseRecords));
  }

  private clearSessionStats(): void {
    localStorage.removeItem(SESSION_STATS_KEY);
  }

  static loadSessionStats(): PomodoroPhaseRecord[] {
    try {
      const raw = localStorage.getItem(SESSION_STATS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** Get aggregated completion stats to send to backend when finishing a quiz */
  getCompletionStats(): PomodoroCompletionStats {
    const records = this.phaseRecords;
    const wasActive = records.length > 0 || this.pomodoroCount$.value > 0;
    const totalFocusMinutes = records.reduce(
      (sum, r) => sum + Math.floor(r.durationSeconds / 60), 0
    );
    const totalQuestions = records.reduce((sum, r) => sum + r.questionsAnswered, 0);
    return {
      pomodoroEnabled: wasActive,
      pomodoroSessions: this.pomodoroCount$.value,
      pomodoroFocusMinutes: totalFocusMinutes,
      pomodoroQuestionsAnswered: totalQuestions,
    };
  }

  // ── Audio ─────────────────────────────────────────────────────────────────

  private playSound(type: 'focus-start' | 'warning' | 'phase-complete' | 'break-complete'): void {
    if (!this.settings$.value.soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const freqMap: Record<string, number> = {
        'focus-start':    880,
        'warning':        660,
        'phase-complete': 1047,
        'break-complete': 784,
      };
      const repsMap: Record<string, number> = {
        'focus-start':    1,
        'warning':        1,
        'phase-complete': 2,
        'break-complete': 3,
      };
      oscillator.frequency.value = freqMap[type] || 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.15;

      const reps = repsMap[type] || 1;
      const now = ctx.currentTime;
      for (let i = 0; i < reps; i++) {
        gainNode.gain.setValueAtTime(0.15, now + i * 0.35);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.35 + 0.25);
      }
      oscillator.start(now);
      oscillator.stop(now + reps * 0.35);
    } catch (_) {}
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  private requestNotificationPermission(): void {
    if (!this.settings$.value.browserNotificationEnabled) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private sendBrowserNotification(): void {
    if (!this.settings$.value.browserNotificationEnabled) return;
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const count = this.pomodoroCount$.value;
        new Notification('QuizKu — Istirahat Selesai! 🍅', {
          body: `Waktu kembali belajar. Pomodoro #${count + 1} siap dimulai.`,
        });
      }
    } catch (_) {}
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
