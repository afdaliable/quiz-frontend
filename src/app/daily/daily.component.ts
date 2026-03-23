import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ThemeService } from '../services/theme.service';
import { DailyChallengeService } from '../services/daily-challenge.service';
import {
  DailyChallengeResponse,
  DailyLeaderboardResponse,
  SubmitChallengeResponse,
} from '../models/daily-challenge.model';

@Component({
  selector: 'app-daily',
  templateUrl: './daily.component.html',
  styleUrls: ['./daily.component.css']
})
export class DailyComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  isLoading = true;
  isSubmitting = false;
  error: string | null = null;

  challenge: DailyChallengeResponse | null = null;
  selectedAnswer: number | null = null;    // 1-5
  result: SubmitChallengeResponse | null = null;
  revealedCorrectAnswer: number | null = null;

  leaderboard: DailyLeaderboardResponse | null = null;
  loadingLeaderboard = false;

  // Timer: waktu jawab (mulai saat soal tampil)
  private questionStartTime = 0;
  elapsedSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Countdown: waktu tersisa sampai reset 00:00 WIB
  countdownDisplay = '--:--:--';
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Leaderboard polling
  private leaderboardSub: Subscription | null = null;
  showLeaderboard = false;

  private themeSub: Subscription | null = null;

  readonly optionLabel: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };

  constructor(
    private themeService: ThemeService,
    private dailyService: DailyChallengeService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.darkMode$.subscribe(d => this.isDarkMode = d);
    this.loadChallenge();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.stopCountdown();
    this.leaderboardSub?.unsubscribe();
    this.themeSub?.unsubscribe();
  }

  loadChallenge(): void {
    this.isLoading = true;
    this.error = null;
    this.dailyService.getTodayChallenge().subscribe({
      next: (data) => {
        this.challenge = data;
        this.isLoading = false;

        const alreadyAnswered = data.already_answered || data.user_attempt !== undefined && data.user_attempt !== null;

        if (alreadyAnswered) {
          // Build result from user_attempt if available
          if (data.user_attempt) {
            // Map from user_attempt format
            const ua = data.user_attempt;
            this.result = {
              is_correct: ua.is_correct,
              correct_answer: this.optKeyToInt(ua.correct_answer || ''),
              score: ua.score,
              rank: ua.rank,
              total_participants: ua.total_participants,
            };
            this.selectedAnswer = this.optKeyToInt(ua.selected_option);
            this.revealedCorrectAnswer = this.optKeyToInt(ua.correct_answer || '');
          }
          if (data.correct_answer) {
            this.revealedCorrectAnswer = this.optKeyToInt(data.correct_answer);
          }
          this.startLeaderboardPolling();
        } else {
          this.startQuestionTimer();
        }
      },
      error: () => {
        this.isLoading = false;
        this.error = 'Gagal memuat tantangan. Silakan coba lagi.';
      }
    });
  }

  // ── Option helpers ────────────────────────────────────────

  get options(): { key: number; label: string; text: string }[] {
    if (!this.challenge) return [];
    const soal = this.challenge.soal;
    if (!soal) {
      // fallback to question.options format
      return (this.challenge.question?.options || []).map((o, i) => ({
        key: i + 1,
        label: this.optionLabel[i + 1],
        text: o.text,
      }));
    }
    const opts: { key: number; label: string; text: string }[] = [];
    const map: [number, string | undefined][] = [
      [1, soal.opt1], [2, soal.opt2], [3, soal.opt3], [4, soal.opt4], [5, soal.opt5]
    ];
    for (const [key, text] of map) {
      if (text) opts.push({ key, label: this.optionLabel[key], text });
    }
    return opts;
  }

  get questionText(): string {
    if (!this.challenge) return '';
    return this.challenge.soal?.soal || this.challenge.question?.question_text || '';
  }

  get challengeDate(): string {
    if (!this.challenge) return '';
    return this.challenge.challenge_date || this.challenge.date || '';
  }

  get totalAttempts(): number {
    return this.challenge?.total_attempts ?? 0;
  }

  get categoryLabel(): string {
    return this.challenge?.category || this.challenge?.question?.category || '';
  }

  private optKeyToInt(key: string): number {
    const map: Record<string, number> = { opt1: 1, opt2: 2, opt3: 3, opt4: 4, opt5: 5 };
    return map[key] ?? parseInt(key) ?? 0;
  }

  // ── Timer (performance.now) ───────────────────────────────

  private startQuestionTimer(): void {
    this.questionStartTime = performance.now();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((performance.now() - this.questionStartTime) / 1000);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatElapsed(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Countdown to 00:00 WIB ────────────────────────────────

  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown(): void {
    const now = new Date();
    const nextMidnightWib = new Date();
    nextMidnightWib.setUTCHours(17, 0, 0, 0);
    if (now >= nextMidnightWib) {
      nextMidnightWib.setUTCDate(nextMidnightWib.getUTCDate() + 1);
    }
    const diffMs = nextMidnightWib.getTime() - now.getTime();
    if (diffMs <= 0) {
      this.loadChallenge();
      return;
    }
    const h = Math.floor(diffMs / 3_600_000).toString().padStart(2, '0');
    const m = Math.floor((diffMs % 3_600_000) / 60_000).toString().padStart(2, '0');
    const s = Math.floor((diffMs % 60_000) / 1_000).toString().padStart(2, '0');
    this.countdownDisplay = `${h}:${m}:${s}`;
  }

  // ── Submit answer ─────────────────────────────────────────

  selectOption(key: number): void {
    if (this.result) return;
    this.selectedAnswer = key;
  }

  confirmAnswer(): void {
    if (!this.selectedAnswer || !this.challenge || this.result || this.isSubmitting) return;

    const timeTakenMs = Math.round(performance.now() - this.questionStartTime);
    this.stopTimer();
    this.isSubmitting = true;

    this.dailyService.submitAnswer({
      selected_answer: this.selectedAnswer,
      time_taken_ms: timeTakenMs,
    }).subscribe({
      next: (res) => {
        this.result = res;
        this.revealedCorrectAnswer = res.correct_answer;
        this.isSubmitting = false;
        this.startLeaderboardPolling();
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.status === 400) {
          this.error = 'Input tidak valid. Silakan pilih jawaban lagi.';
        } else {
          this.error = 'Gagal mengirim jawaban. Silakan coba lagi.';
        }
        this.startQuestionTimer();
      }
    });
  }

  // ── Leaderboard polling ───────────────────────────────────

  toggleLeaderboard(): void {
    this.showLeaderboard = !this.showLeaderboard;
  }

  private startLeaderboardPolling(): void {
    this.loadingLeaderboard = true;
    this.leaderboardSub = interval(30_000).pipe(
      startWith(0),
      switchMap(() => this.dailyService.getLeaderboard())
    ).subscribe({
      next: (lb) => {
        this.leaderboard = lb;
        this.loadingLeaderboard = false;
      },
      error: () => { this.loadingLeaderboard = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  get hasAnswered(): boolean {
    return this.result !== null;
  }

  formatTime(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} detik`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m} mnt ${rem} dtk` : `${m} menit`;
  }

  rankLabel(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }
}
