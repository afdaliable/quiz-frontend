import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { OnboardingService } from '../services/onboarding.service';
import { AuthService } from '../services/auth.service';
import { QuestionService } from '../services/question.service';
import { PaketSoal } from '../models/paket-soal.model';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface GoalOption {
  key: string;
  icon: string;
  label: string;
  sublabel: string;
}

interface TimeframeOption {
  key: string;
  label: string;
  emoji: string;
  tagline: string;
}

interface FeatureSlide {
  title: string;
  description: string;
  points: { icon: string; text: string }[];
}

const GOAL_KEYWORDS: Record<string, string[]> = {
  cpns:     ['skd', 'cpns', 'twk', 'tiu', 'tkp', 'pppk', 'asn', 'kedinasan'],
  snbt:     ['snbt', 'utbk', 'ptn', 'simak', 'mandiri', 'saintek', 'soshum'],
  ppg:      ['ppg', 'guru', 'pendidikan', 'p3k'],
  nakes:    ['nakes', 'ukmppd', 'ukni', 'kebidanan', 'farmasi', 'kesehatan'],
  toefl:    ['toefl', 'ielts', 'inggris', 'english'],
  bumn:     ['bumn', 'tpa', 'tbi', 'psikotes', 'rekrutmen'],
  beasiswa: ['beasiswa', 'lpdp', 'bpi', 'scholarship'],
  other:    [],
};

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit, OnDestroy {
  currentStep = 1;
  readonly totalSteps = 4;

  // Step 1
  selectedGoals: string[] = [];

  // Step 2
  selectedTimeframe = '';

  // Step 3
  currentFeatureSlide = 0;
  readonly totalFeatureSlides = 3;
  touchStartX = 0;

  // Step 4
  recommendedPakets: PaketSoal[] = [];
  private allPakets: PaketSoal[] = [];

  isDarkMode = false;
  isAnimating = false;
  animatingForward = true;

  private themeSub: Subscription | null = null;

  get progressPercent(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }

  get canGoNext(): boolean {
    if (this.currentStep === 1) return this.selectedGoals.length > 0;
    if (this.currentStep === 2) return this.selectedTimeframe !== '';
    return true;
  }

  get userName(): string {
    const user = this.authService.getCurrentUser();
    if (user && user.display_name) return user.display_name;
    return 'Kamu';
  }

  readonly goalOptions: GoalOption[] = [
    { key: 'cpns',     icon: '🏛️', label: 'CPNS / PPPK',       sublabel: 'ASN & Kedinasan' },
    { key: 'snbt',     icon: '🎓', label: 'Masuk PTN',          sublabel: 'SNBT / Mandiri / SIMAK' },
    { key: 'ppg',      icon: '👩‍🏫', label: 'Sertifikasi Guru', sublabel: 'PPG / P3K Guru' },
    { key: 'nakes',    icon: '🏥', label: 'Ujian Nakes',        sublabel: 'UKMPPD / UKNI dll' },
    { key: 'toefl',    icon: '🌏', label: 'TOEFL / IELTS',      sublabel: 'Bahasa Inggris' },
    { key: 'bumn',     icon: '💼', label: 'Seleksi BUMN',       sublabel: 'TPA / TBI / Psikotes' },
    { key: 'beasiswa', icon: '🎯', label: 'Beasiswa',           sublabel: 'LPDP / BPI / dll' },
    { key: 'other',    icon: '❓', label: 'Lainnya',            sublabel: 'Belum tahu / Eksplorasi' },
  ];

  readonly timeframeOptions: TimeframeOption[] = [
    { key: 'less_1_month',  label: 'Kurang dari 1 bulan lagi', emoji: '⚡', tagline: 'Oke, kita harus fokus! Kamu akan dapat rekomendasi latihan intensif.' },
    { key: '1_3_months',    label: '1–3 bulan lagi',           emoji: '📅', tagline: 'Waktu yang ideal untuk persiapan matang. Yuk mulai dari sekarang!' },
    { key: '3_6_months',    label: '3–6 bulan lagi',           emoji: '📖', tagline: 'Santai tapi konsisten. Fondasi yang kuat dimulai dari sini.' },
    { key: 'more_6_months', label: 'Lebih dari 6 bulan',       emoji: '🌱', tagline: 'Mulai bangun fondasi sejak dini — kamu sudah selangkah lebih maju!' },
    { key: 'unknown',       label: 'Belum ada jadwal pasti',   emoji: '🤷', tagline: 'Tidak masalah! Jelajahi dulu dan temukan apa yang menarik buatmu.' },
  ];

  readonly featureSlides: FeatureSlide[] = [
    {
      title: '3 Mode Belajar',
      description: 'Sesuaikan cara belajar dengan kondisimu',
      points: [
        { icon: '🎯', text: 'Mode Ujian — timer aktif, simulasi nyata' },
        { icon: '📖', text: 'Mode Belajar — pembahasan langsung per soal' },
        { icon: '👁️', text: 'Mode Review — analisis jawaban setelah selesai' },
      ]
    },
    {
      title: 'Pantau Progresmu',
      description: 'Lihat perkembangan belajarmu dari waktu ke waktu',
      points: [
        { icon: '📊', text: 'Skor berkembang terpantau di riwayat kuis' },
        { icon: '🔥', text: 'Pertahankan streak belajar harian' },
        { icon: '📋', text: 'Riwayat lengkap semua sesi latihan' },
      ]
    },
    {
      title: 'Bookmark Soal Sulit',
      description: 'Tandai soal yang ingin dipelajari ulang',
      points: [
        { icon: '🔖', text: 'Bookmark soal dari halaman kuis' },
        { icon: '📂', text: 'Semua soal tersimpan di satu tempat' },
        { icon: '⚡', text: 'Latih ulang kapan saja dari halaman Bookmark' },
      ]
    },
  ];

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private onboardingService: OnboardingService,
    private authService: AuthService,
    private questionService: QuestionService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.darkMode$.subscribe(d => this.isDarkMode = d);
    // Pre-load paket soal in background for step 4 recommendations
    this.questionService.getListPaketSoal().pipe(
      catchError(() => of([]))
    ).subscribe((data: any) => {
      if (Array.isArray(data)) {
        this.allPakets = data;
      } else if (data && Array.isArray(data.paket_soal)) {
        this.allPakets = data.paket_soal;
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  // ── Navigation ──────────────────────────────────────────────

  goNext(): void {
    if (!this.canGoNext || this.isAnimating) return;
    this.animatingForward = true;
    if (this.currentStep === 3) {
      this.buildRecommendations();
    }
    this.isAnimating = true;
    this.currentStep++;
    setTimeout(() => { this.isAnimating = false; }, 350);
  }

  goBack(): void {
    if (this.currentStep === 1 || this.isAnimating) return;
    this.animatingForward = false;
    this.isAnimating = true;
    this.currentStep--;
    setTimeout(() => { this.isAnimating = false; }, 350);
  }

  skip(): void {
    this.onboardingService.markComplete();
    this.router.navigate(['/home']);
  }

  // ── Step 1 ───────────────────────────────────────────────────

  toggleGoal(key: string): void {
    const idx = this.selectedGoals.indexOf(key);
    if (idx >= 0) {
      this.selectedGoals.splice(idx, 1);
    } else {
      this.selectedGoals.push(key);
    }
  }

  isGoalSelected(key: string): boolean {
    return this.selectedGoals.indexOf(key) >= 0;
  }

  // ── Step 2 ───────────────────────────────────────────────────

  selectTimeframe(key: string): void {
    this.selectedTimeframe = key;
  }

  getTimeframeTagline(key: string): string {
    const opt = this.timeframeOptions.find(t => t.key === key);
    return opt ? opt.tagline : '';
  }

  // ── Step 3 Carousel ──────────────────────────────────────────

  nextFeatureSlide(): void {
    if (this.currentFeatureSlide < this.totalFeatureSlides - 1) {
      this.currentFeatureSlide++;
    }
  }

  prevFeatureSlide(): void {
    if (this.currentFeatureSlide > 0) {
      this.currentFeatureSlide--;
    }
  }

  setFeatureSlide(idx: number): void {
    this.currentFeatureSlide = idx;
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    const dx = event.changedTouches[0].screenX - this.touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) {
        this.nextFeatureSlide();
      } else {
        this.prevFeatureSlide();
      }
    }
  }

  getSlideIndexArray(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < this.totalFeatureSlides; i++) arr.push(i);
    return arr;
  }

  // ── Step 4 Recommendations ───────────────────────────────────

  private buildRecommendations(): void {
    if (this.allPakets.length === 0) {
      this.recommendedPakets = [];
      return;
    }

    const keywords: string[] = [];
    for (let i = 0; i < this.selectedGoals.length; i++) {
      const goal = this.selectedGoals[i];
      const kws = GOAL_KEYWORDS[goal] || [];
      for (let j = 0; j < kws.length; j++) {
        keywords.push(kws[j]);
      }
    }

    if (keywords.length === 0) {
      this.recommendedPakets = this.allPakets.slice(0, 3);
      return;
    }

    const scored: { paket: PaketSoal; score: number }[] = [];
    for (let i = 0; i < this.allPakets.length; i++) {
      const p = this.allPakets[i];
      const name = p.nama_paket_soal.toLowerCase();
      const cat = (p.kategori_soal || '').toLowerCase();
      let score = 0;
      for (let j = 0; j < keywords.length; j++) {
        if (name.indexOf(keywords[j]) >= 0 || cat.indexOf(keywords[j]) >= 0) score++;
      }
      scored.push({ paket: p, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const matched: PaketSoal[] = [];
    for (let i = 0; i < scored.length && matched.length < 3; i++) {
      if (scored[i].score > 0) matched.push(scored[i].paket);
    }

    this.recommendedPakets = matched.length >= 2 ? matched : this.allPakets.slice(0, 3);
  }

  startPackage(paket: PaketSoal): void {
    localStorage.setItem('selectedPaket', JSON.stringify(paket));
    this.completeOnboarding();
    this.router.navigate(['/welcome']);
  }

  startFirstPackage(): void {
    if (this.recommendedPakets.length > 0) {
      this.startPackage(this.recommendedPakets[0]);
    } else {
      this.completeOnboarding();
      this.router.navigate(['/home']);
    }
  }

  goToHome(): void {
    this.completeOnboarding();
    this.router.navigate(['/home']);
  }

  completeOnboarding(): void {
    const data = {
      goals: this.selectedGoals,
      timeframe: this.selectedTimeframe,
      examDate: null,
      onboardingCompleted: true
    };
    this.onboardingService.saveToLocal(data);
    this.onboardingService.markComplete();
    this.onboardingService.syncToBackend(data).subscribe();
  }

  // ── Helpers ──────────────────────────────────────────────────

  getEstimatedMinutes(jumlahSoal: number): number {
    return Math.ceil(jumlahSoal * 1.5);
  }

  getStepArray(): number[] {
    const arr: number[] = [];
    for (let i = 1; i <= this.totalSteps; i++) arr.push(i);
    return arr;
  }
}
