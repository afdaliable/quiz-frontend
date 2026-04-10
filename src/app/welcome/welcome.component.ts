import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { QuestionService } from '../services/question.service';
import { Subscription } from 'rxjs';
import { PaketSoal } from '../models/paket-soal.model';
import { PomodoroService, PomodoroSettings, DEFAULT_SETTINGS } from '../services/pomodoro.service';

const CATEGORY_CONFIG: Record<string, { headerClass: string; icon: string }> = {
  'matematika':   { headerClass: 'bg-blue-600',    icon: '🔢' },
  'bahasa':       { headerClass: 'bg-emerald-600',  icon: '📝' },
  'sains':        { headerClass: 'bg-violet-600',   icon: '🔬' },
  'ipa':          { headerClass: 'bg-green-600',    icon: '🧪' },
  'ips':          { headerClass: 'bg-amber-600',    icon: '🌍' },
  'sejarah':      { headerClass: 'bg-orange-600',   icon: '📜' },
  'geografi':     { headerClass: 'bg-teal-600',     icon: '🗺️' },
  'ekonomi':      { headerClass: 'bg-yellow-600',   icon: '💰' },
  'biologi':      { headerClass: 'bg-lime-600',     icon: '🧬' },
  'fisika':       { headerClass: 'bg-cyan-600',     icon: '⚛️' },
  'kimia':        { headerClass: 'bg-purple-600',   icon: '🧪' },
  'komputer':     { headerClass: 'bg-slate-600',    icon: '💻' },
  'teknologi':    { headerClass: 'bg-indigo-600',   icon: '⚙️' },
};
const DEFAULT_CONFIG = { headerClass: 'bg-indigo-600', icon: '📚' };

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  selectedPaket: PaketSoal | null = null;
  durasiOptions: number[] = [15, 30, 45, 60, 90, 120];
  selectedDurasi: number = 30;
  user: any;
  isDarkMode: boolean = false;
  isAuthenticated: boolean = false;
  quizMode: 'exam' | 'study' | 'review' = 'exam';
  estimasiDetikPerSoal: number = 0;

  categoryHeaderClass: string = DEFAULT_CONFIG.headerClass;
  categoryIcon: string = DEFAULT_CONFIG.icon;
  userInitial: string = '?';

  // Package stats
  bestScore: number | null = null;
  attemptCount: number = 0;
  isLoadingStats: boolean = false;

  // Pomodoro settings
  pomodoroEnabled = false;
  pomodoroPreset: 'classic' | 'short' | 'long' | 'custom' = 'classic';
  pomodoroFocus = 25;
  pomodoroBreak = 5;
  readonly pomodoroPresets: Array<{ k: 'classic' | 'short' | 'long' | 'custom'; l: string }> = [
    { k: 'classic', l: 'Klasik'  },
    { k: 'short',   l: 'Singkat' },
    { k: 'long',    l: 'Panjang' },
    { k: 'custom',  l: 'Custom'  },
  ];

  private userSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private authService: AuthService,
    private questionService: QuestionService,
    private pomodoroService: PomodoroService
  ) {}

  ngOnInit(): void {
    const token = this.authService.getToken();
    this.isAuthenticated = !!token;

    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.user = user;
      if (user?.display_name) {
        this.userInitial = user.display_name.charAt(0).toUpperCase();
      }
    });

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
      this.resolveCategoryConfig();
      this.recalcEstimasi();
      this.loadPackageStats();
    }

    // Reset quizMode to default so stale localStorage from prior sessions doesn't interfere
    localStorage.removeItem('quizMode');
    localStorage.removeItem('isReviewMode');

    // Load persisted Pomodoro settings
    const saved = this.pomodoroService.settings;
    this.pomodoroEnabled = saved.enabled;
    this.pomodoroFocus = saved.focusDuration;
    this.pomodoroBreak = saved.shortBreakDuration;
    this.inferPreset();

    this.themeService.darkMode$.subscribe(isDark => (this.isDarkMode = isDark));
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  onDurasiChange(): void {
    this.recalcEstimasi();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onPomodoroPresetChange(preset: 'classic' | 'short' | 'long' | 'custom'): void {
    this.pomodoroPreset = preset;
    switch (preset) {
      case 'classic': this.pomodoroFocus = 25; this.pomodoroBreak = 5;  break;
      case 'short':   this.pomodoroFocus = 15; this.pomodoroBreak = 3;  break;
      case 'long':    this.pomodoroFocus = 50; this.pomodoroBreak = 10; break;
    }
  }

  private inferPreset(): void {
    if (this.pomodoroFocus === 25 && this.pomodoroBreak === 5)   { this.pomodoroPreset = 'classic'; return; }
    if (this.pomodoroFocus === 15 && this.pomodoroBreak === 3)   { this.pomodoroPreset = 'short';   return; }
    if (this.pomodoroFocus === 50 && this.pomodoroBreak === 10)  { this.pomodoroPreset = 'long';    return; }
    this.pomodoroPreset = 'custom';
  }

  startQuiz(): void {
    if (this.selectedPaket) {
      const hasValidId = this.selectedPaket.id || this.selectedPaket.id_nama_paket_soal;
      if (!hasValidId || !this.selectedPaket.nama_paket_soal || !this.selectedPaket.kategori_soal) {
        console.error('Invalid selected paket:', this.selectedPaket);
        alert('Error: Invalid quiz data. Please go back and select a quiz again.');
        return;
      }

      // Save Pomodoro settings, then start if enabled
      this.pomodoroService.updateSettings({
        enabled: this.pomodoroEnabled,
        focusDuration: this.pomodoroFocus,
        shortBreakDuration: this.pomodoroBreak,
      });
      if (this.pomodoroEnabled) {
        this.pomodoroService.start();
      } else {
        this.pomodoroService.stop();
      }

      localStorage.setItem('durasi', this.selectedDurasi.toString());
      localStorage.setItem('isReviewMode', (this.quizMode === 'review').toString());
      localStorage.setItem('quizMode', this.quizMode);
      this.router.navigate(['/question']);
    } else {
      console.error('No paket selected');
      alert('Please select a quiz package first.');
    }
  }

  private loadPackageStats(): void {
    if (!this.selectedPaket?.nama_paket_soal) return;
    this.isLoadingStats = true;
    const packageName = this.selectedPaket.nama_paket_soal;

    this.questionService.getQuizHistory(1, 200).subscribe({
      next: (res) => {
        const entries = (res.data || []).filter(
          e => e.package_name === packageName && e.session_type !== 'study'
        );
        this.attemptCount = entries.length;
        this.bestScore = entries.length > 0
          ? Math.max(...entries.map(e => e.score))
          : null;
        this.isLoadingStats = false;
      },
      error: () => {
        this.isLoadingStats = false;
      }
    });
  }

  private resolveCategoryConfig(): void {
    if (!this.selectedPaket?.kategori_soal) return;
    const key = this.selectedPaket.kategori_soal.toLowerCase();
    const matched = Object.entries(CATEGORY_CONFIG).find(([k]) => key.includes(k));
    const config = matched ? matched[1] : DEFAULT_CONFIG;
    this.categoryHeaderClass = config.headerClass;
    this.categoryIcon = config.icon;
  }

  private recalcEstimasi(): void {
    if (this.selectedPaket && this.selectedPaket.jumlah_soal > 0) {
      const totalDetik = this.selectedDurasi * 60;
      this.estimasiDetikPerSoal = Math.round(totalDetik / this.selectedPaket.jumlah_soal);
    }
  }
}
