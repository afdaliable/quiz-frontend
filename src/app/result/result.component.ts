import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { XpBreakdown, XpAwardResult, LEVEL_CONFIGS, LevelInfo } from '../models/xp-system.model';
import { PomodoroService, PomodoroPhaseRecord } from '../services/pomodoro.service';
import { AnalyticsService } from '../services/analytics.service';
import { ScoreDataPoint } from '../models/score-history.model';
import html2canvas from 'html2canvas';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent implements OnInit, OnDestroy {
  name: string = '';
  selectedPaket: any = null;
  totalQuestions: number = 0;
  answeredQuestions: number = 0;
  unansweredQuestions: number = 0;
  showScore: boolean = false;
  points: number = 0;
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  currentUser: any;
  isDarkMode: boolean = false;
  quizMode: 'exam' | 'study' | 'review' | 'simulasi' = 'exam';
  simulasiData: { simulasi_id: number; attempt_number: number; passing_score: number; session_id: string } | null = null;
  @ViewChild('resultCard', { static: false }) resultCard!: ElementRef;

  motivationMessage: string = '';
  wrongQuestions: number[] = [];
  celebrationActive: boolean = false;
  paketScoreHistory: ScoreDataPoint[] = [];

  // Pomodoro stats
  pomodoroRecords: PomodoroPhaseRecord[] = [];

  xpBreakdown: XpBreakdown | null = null;
  xpResult: XpAwardResult | null = null;
  showLevelUpModal: boolean = false;
  levelUpOldLevel: LevelInfo | null = null;
  levelUpNewLevel: LevelInfo | null = null;
  animatedXpTotal: number = 0;

  constructor(
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loadResultData();
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  ngOnDestroy(): void {
    // Clean up simulasi-specific keys when leaving the result page
    if (this.quizMode === 'simulasi') {
      localStorage.removeItem('simulasiData');
      localStorage.removeItem('quizMode');
    }
  }

  get isSimulasiResult(): boolean {
    return this.quizMode === 'simulasi';
  }

  get simulasiPassed(): boolean {
    if (!this.simulasiData) return false;
    return this.points >= this.simulasiData.passing_score;
  }

  get simulasiShortfall(): number {
    if (!this.simulasiData) return 0;
    return Math.max(0, this.simulasiData.passing_score - this.points);
  }

  loadResultData(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }

    this.quizMode = (localStorage.getItem('quizMode') as 'exam' | 'study' | 'review' | 'simulasi') || 'exam';

    const simRaw = localStorage.getItem('simulasiData');
    if (simRaw) {
      try { this.simulasiData = JSON.parse(simRaw); } catch { this.simulasiData = null; }
    }

    this.totalQuestions = parseInt(localStorage.getItem('totalQuestions') || '0');
    this.answeredQuestions = parseInt(localStorage.getItem('answeredQuestions') || '0');
    this.unansweredQuestions = this.totalQuestions - this.answeredQuestions;
    this.points = parseInt(localStorage.getItem('points') || '0');
    this.correctAnswers = parseInt(localStorage.getItem('correctAnswers') || '0');
    this.incorrectAnswers = parseInt(localStorage.getItem('incorrectAnswers') || '0');

    const wrongData = localStorage.getItem('wrongQuestions');
    if (wrongData) {
      this.wrongQuestions = JSON.parse(wrongData);
    }

    this.motivationMessage = this.getMotivationMessage();

    if (this.points >= 80) {
      this.celebrationActive = true;
      setTimeout(() => (this.celebrationActive = false), 5000);
    }

    const xpBreakdownData = localStorage.getItem('xpBreakdown');
    if (xpBreakdownData) {
      this.xpBreakdown = JSON.parse(xpBreakdownData);
    }

    const xpResultData = localStorage.getItem('xpResult');
    if (xpResultData) {
      this.xpResult = JSON.parse(xpResultData);
      this.animatedXpTotal = (this.xpResult?.total_xp ?? 0) - (this.xpResult?.xp_awarded ?? 0);

      if (this.xpResult!.leveled_up) {
        const oldLevelNum = this.xpResult!.new_level - 1;
        this.levelUpOldLevel = LEVEL_CONFIGS.find(l => l.level === oldLevelNum) || null;
        this.levelUpNewLevel = LEVEL_CONFIGS.find(l => l.level === this.xpResult!.new_level) || null;
        setTimeout(() => { this.showLevelUpModal = true; }, 800);
      }

      this.startXpAnimation();
    }

    // Load Pomodoro session stats
    this.pomodoroRecords = PomodoroService.loadSessionStats();

    // Load mini chart per paket
    const paketSoalId: number | null = this.selectedPaket?.id_nama_paket_soal ?? null;
    if (paketSoalId) {
      this.analyticsService.getScoreHistory({ package_id: paketSoalId }).subscribe({
        next: (res) => this.paketScoreHistory = res.data_points,
        error: () => {}
      });
    }
  }

  startXpAnimation(): void {
    if (!this.xpResult) return;
    const target = this.xpResult.total_xp;
    const start = target - this.xpResult.xp_awarded;
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.animatedXpTotal = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  onLevelUpModalClosed(): void {
    this.showLevelUpModal = false;
  }

  get pomodoroBestRecord(): PomodoroPhaseRecord | null {
    if (!this.pomodoroRecords.length) return null;
    return this.pomodoroRecords.reduce((best, r) =>
      r.questionsAnswered > best.questionsAnswered ? r : best
    );
  }

  get pomodoroTotalFocusMinutes(): number {
    return this.pomodoroRecords.reduce((sum, r) => sum + Math.floor(r.durationSeconds / 60), 0);
  }

  get pomodoroQuestionsPerMinute(): number {
    if (!this.pomodoroTotalFocusMinutes) return 0;
    const total = this.pomodoroRecords.reduce((sum, r) => sum + r.questionsAnswered, 0);
    return Math.round((total / this.pomodoroTotalFocusMinutes) * 10) / 10;
  }

  pomodoroBarWidth(record: PomodoroPhaseRecord): number {
    const max = this.pomodoroBestRecord?.questionsAnswered || 1;
    return Math.round((record.questionsAnswered / max) * 100);
  }

  getMotivationMessage(): string {
    if (this.points >= 80) return 'Luar biasa! Kamu menguasai materi ini! 🎉';
    if (this.points >= 50) return 'Hampir! Sedikit lagi kamu pasti bisa 🎯';
    return 'Jangan menyerah! Review jawaban dan coba lagi 💪';
  }

  get wrongQuestionsPreview(): number[] {
    return this.wrongQuestions.slice(0, 10);
  }

  get remainingWrongCount(): number {
    return Math.max(0, this.wrongQuestions.length - 10);
  }

  toggleScore(): void {
    this.showScore = !this.showScore;
  }

  reviewAnswers(): void {
    this.router.navigate(['/review']);
  }

  retryQuiz(): void {
    this.router.navigate(['/welcome']);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  async shareResult(): Promise<void> {
    try {
      const canvas = await html2canvas(this.resultCard.nativeElement, {
        backgroundColor: null,
        scale: 2
      });

      const imageUrl = canvas.toDataURL('image/png');

      // Web Share API (mobile)
      if (navigator.share) {
        const blob = await (await fetch(imageUrl)).blob();
        try {
          await navigator.share({
            files: [new File([blob], 'hasil-kuis.png', { type: 'image/png' })],
            title: 'Hasil Kuis Nagih'
          });
        } catch (shareError) {
          // Fallback to download if share is not supported or cancelled
          console.log('Share failed or cancelled, falling back to download:', shareError);
          const link = document.createElement('a');
          link.download = 'hasil-kuis.png';
          link.href = imageUrl;
          link.click();
        }
      } else {
        // Fallback: download gambar
        const link = document.createElement('a');
        link.download = 'hasil-kuis.png';
        link.href = imageUrl;
        link.click();
      }
    } catch (error) {
      console.error('Gagal membagikan hasil:', error);
      alert('Gagal membagikan hasil. Silakan coba lagi.');
    }
  }
}
