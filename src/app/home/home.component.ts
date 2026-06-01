import { Component, OnInit, OnDestroy } from '@angular/core';
import { Category } from '../models/category.model'; // Ensure this path is correct
import { PaketSoal } from '../models/paket-soal.model' // Ensure this path is correct
import { QuestionService } from '../services/question.service'; // Ensure this path is correct
import { Router } from '@angular/router';
import { UserService } from '../services/user.service'; // Ensure this path is correct
import { ThemeService } from '../services/theme.service'; // Ensure this path is correct
import { AuthService } from '../services/auth.service';
import { PremiumService, PremiumPlan } from '../services/premium.service';
import { OnboardingService } from '../services/onboarding.service';
import { Subscription } from 'rxjs';
import { QuizHistoryEntry } from '../models/quiz-history.model';
import { QuizSessionService } from '../services/quiz-session.service';
import { SimulasiUjian, SimulasiUjianService } from '../services/simulasi-ujian.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  categories: Category[] = [];
  paketSoalList: PaketSoal[] = [];
  filteredPaketSoalList: PaketSoal[] = [];
  selectedCategory: string = '';

  // ── Mode tabs (Semua / Simulasi / Latihan) ──────────────────────────────
  // Separates conceptual axes: a "mode" (how you practice) vs a "jalur"
  // (exam track). Categories named below are modes, the rest are jalur.
  readonly SIMULASI_CAT = 'SIMULASI UJIAN';
  readonly TOPIK_CAT = 'LATIHAN TOPIK';
  activeMode: 'all' | 'simulasi' | 'latihan' = 'all';
  isLoggedIn: boolean = false;
  searchTerm: string = '';
  sortField: 'nama_paket_soal' | 'jumlah_soal' = 'nama_paket_soal';
  sortDirection: 'asc' | 'desc' = 'asc';
  isDarkMode: boolean = false;
  isCategoriesCollapsed: boolean = true;
  isLoading: boolean = false;
  private userSubscription: Subscription | null = null;

  // Streak banner properties
  streakDays: number = 0;
  showStreakBanner: boolean = false;
  streakDismissedAt: number | null = null;

  // Continue Learning properties
  latestHistory: QuizHistoryEntry | null = null;
  showContinueLearning: boolean = false;

  // Premium related properties
  showPremiumModal: boolean = false;
  selectedPremiumQuiz: PaketSoal | null = null;
  availablePlans: PremiumPlan[] = [];
  hasPremiumAccess: boolean = false;

  // Random quiz modal
  showRandomModal: boolean = false;
  randomCount: number = 10;
  randomCategory: string = '';
  isStartingRandom: boolean = false;

  // Personalization
  personalizedPakets: PaketSoal[] = [];
  onboardingGoals: string[] = [];
  showPersonalizedSection = false;

  // Simulasi (proper exam flow) — loaded so the Simulasi tab shows real
  // simulasi items grouped by exam track, all using the same start flow.
  simulasiList: SimulasiUjian[] = [];
  startingSimulasiId: number | null = null;
  // Friendly labels for exam_type grouping keys.
  readonly examTypeLabels: { [key: string]: string } = {
    skd: 'SKD CPNS/PPPK',
    pppk: 'PPPK',
    stan: 'PKN STAN',
    rbb: 'BUMN (RBB)',
    lpdp: 'LPDP',
    bumn: 'BUMN',
  };

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private authService: AuthService,
    private premiumService: PremiumService,
    private quizSessionService: QuizSessionService,
    private onboardingService: OnboardingService,
    private simulasiService: SimulasiUjianService
  ) {}

  ngOnInit(): void {
    // Check for dismissed streak banner
    const dismissedAt = localStorage.getItem('streakBannerDismissed');
    if (dismissedAt) {
      this.streakDismissedAt = parseInt(dismissedAt);
    }

    // Check if we have an auth token
    const token = this.authService.getToken();
    
    console.log('Home Init - Auth token exists:', !!token);
    
    if (token) {
      this.isLoggedIn = true;
      this.loadCategories();
      this.loadPaketSoal();
      this.loadSimulasi();
      this.loadUserStats();
      this.loadLatestHistory();

      // Add a longer delay before checking premium status to ensure session is fully established
      setTimeout(() => {
        this.checkPremiumStatus();
      }, 2000); // 2 second delay
    } else {
      // Don't redirect here, let the auth guard handle it
      console.log('No auth token in home component');
    }
    
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Subscribe to user changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isLoggedIn = !!user;
      
      if (this.isLoggedIn) {
        this.loadCategories();
        this.loadPaketSoal();
        this.loadSimulasi();
        this.loadUserStats();
        this.loadLatestHistory();

        // Add a longer delay before checking premium status to ensure session is fully established
        setTimeout(() => {
          this.checkPremiumStatus();
        }, 2000); // 2 second delay
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadCategories(): void {
    this.questionService.getAllCategories().subscribe({
      next: (data: Category[]) => {
        this.categories = data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadLatestHistory(): void {
    this.questionService.getQuizHistory(1, 1).subscribe({
      next: (res) => {
        if (res.data && res.data.length > 0) {
          this.latestHistory = res.data[0];
          this.showContinueLearning = true;
        } else {
          this.showContinueLearning = false;
        }
      },
      error: (error) => {
        console.error('Error loading latest history:', error);
        this.showContinueLearning = false;
      }
    });
  }

  loadUserStats(): void {
    this.userService.getUserStats().subscribe({
      next: (stats) => {
        this.streakDays = stats.learning_streak_days || 0;

        // Show banner if streak >= 3 and not dismissed recently (within last 24 hours)
        const now = Date.now();
        const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

        if (this.streakDays >= 3 &&
            (!this.streakDismissedAt || this.streakDismissedAt < twentyFourHoursAgo)) {
          this.showStreakBanner = true;
        }
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
      }
    });
  }

  loadPaketSoal(): void {
    console.log('Loading paket soal...');
    this.isLoading = true;
    this.questionService.getListPaketSoal().subscribe({
      next: (data: PaketSoal[]) => {
        console.log('Paket soal loaded:', data);
        this.paketSoalList = data;
        this.applyFilters();
        this.isLoading = false;
        // Load personalized section after paket data is available
        this.loadPersonalizedContent();
      },
      error: (error) => {
        console.error('Error in home component:', error);
        this.isLoading = false;
        if (error.status === 401) {
          // Let the interceptor handle 401 errors
          console.error('Unauthorized error in home component');
        }
      }
    });
  }

  private loadPersonalizedContent(): void {
    const onboardingData = this.onboardingService.getLocal();
    this.onboardingGoals = onboardingData?.goals ?? [];

    if (this.onboardingGoals.length === 0) {
      this.showPersonalizedSection = false;
      return;
    }

    // If only 'other' selected, skip personalization
    const meaningfulGoals = this.onboardingGoals.filter(g => g !== 'other');
    if (meaningfulGoals.length === 0) {
      this.showPersonalizedSection = false;
      return;
    }

    this.filterPersonalizedPakets();
  }

  private filterPersonalizedPakets(): void {
    const keywordMap: Record<string, string[]> = {
      cpns:     ['SKD', 'CPNS', 'TWK', 'TIU', 'TKP', 'PPPK', 'ASN'],
      snbt:     ['SNBT', 'UTBK', 'PTN', 'SAINTEK', 'SOSHUM', 'TPS'],
      ppg:      ['PPG', 'GURU', 'SERTIFIKASI'],
      nakes:    ['UKMPPD', 'NAKES', 'DOKTER', 'PERAWAT', 'UKNI'],
      toefl:    ['TOEFL', 'IELTS', 'BAHASA INGGRIS', 'ENGLISH'],
      bumn:     ['BUMN', 'TPA', 'PSIKOTES'],
      beasiswa: ['LPDP', 'BEASISWA', 'BPI'],
    };

    const allKeywords: string[] = [];
    for (let i = 0; i < this.onboardingGoals.length; i++) {
      const goal = this.onboardingGoals[i];
      const kws = keywordMap[goal] || [];
      for (let j = 0; j < kws.length; j++) {
        allKeywords.push(kws[j]);
      }
    }

    if (allKeywords.length === 0) {
      this.showPersonalizedSection = false;
      return;
    }

    const matched = this.paketSoalList.filter(p => {
      const name = (p.nama_paket_soal || '').toUpperCase();
      const cat  = (p.kategori_soal || '').toUpperCase();
      for (let i = 0; i < allKeywords.length; i++) {
        if (name.indexOf(allKeywords[i]) >= 0 || cat.indexOf(allKeywords[i]) >= 0) {
          return true;
        }
      }
      return false;
    });

    this.personalizedPakets = matched.slice(0, 6);
    this.showPersonalizedSection = this.personalizedPakets.length > 0;
  }

  clearPersonalization(): void {
    this.showPersonalizedSection = false;
  }

  // True if this category is a "mode" (Simulasi / Latihan Topik), not a jalur.
  isModeCategory(catName: string): boolean {
    return catName === this.SIMULASI_CAT || catName === this.TOPIK_CAT;
  }

  // Jalur categories = real exam tracks (everything that isn't a mode and has pakets).
  get jalurCategories(): Category[] {
    return this.categories.filter(c =>
      !this.isModeCategory(c.nama_kategori) && this.countForCategory(c.nama_kategori) > 0
    );
  }

  // Pakets visible under the current mode (before jalur chip narrowing).
  private paketsForMode(): PaketSoal[] {
    if (this.activeMode === 'simulasi') {
      return this.paketSoalList.filter(p => p.kategori_soal === this.SIMULASI_CAT);
    }
    if (this.activeMode === 'latihan') {
      // Latihan = everything except simulasi (jalur pakets + latihan topik)
      return this.paketSoalList.filter(p => p.kategori_soal !== this.SIMULASI_CAT);
    }
    return [...this.paketSoalList];
  }

  setMode(mode: 'all' | 'simulasi' | 'latihan'): void {
    this.activeMode = mode;
    this.selectedCategory = '';
    this.selectedExamType = '';
    this.applyFilters();
  }

  countForMode(mode: 'all' | 'simulasi' | 'latihan'): number {
    // simulasi pakets already live in paketSoalList, so 'all' = paketSoalList.
    if (mode === 'simulasi') return this.simulasiList.length;
    if (mode === 'latihan') return this.paketSoalList.filter(p => p.kategori_soal !== this.SIMULASI_CAT).length;
    return this.paketSoalList.length;
  }

  // ── Simulasi (proper exam flow) ─────────────────────────────────────────
  selectedExamType: string = '';

  loadSimulasi(): void {
    this.simulasiService.getListSimulasi().subscribe({
      next: (data) => { this.simulasiList = data || []; },
      error: (err) => { console.error('Error loading simulasi:', err); this.simulasiList = []; },
    });
  }

  // Distinct exam tracks present in the simulasi list (for the filter chips).
  get simulasiExamTypes(): string[] {
    const seen = new Set<string>();
    for (const s of this.simulasiList) seen.add(s.exam_type || 'lainnya');
    return Array.from(seen);
  }

  examTypeLabel(type: string): string {
    return this.examTypeLabels[type] || (type === 'lainnya' ? 'Lainnya' : type.toUpperCase());
  }

  countForExamType(type: string): number {
    return this.simulasiList.filter(s => (s.exam_type || 'lainnya') === type).length;
  }

  filterByExamType(type: string | null): void {
    this.selectedExamType = type || '';
  }

  // Simulasi cards to show under the Simulasi tab, narrowed by the chip filter.
  get visibleSimulasi(): SimulasiUjian[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.simulasiList.filter(s => {
      if (this.selectedExamType && (s.exam_type || 'lainnya') !== this.selectedExamType) return false;
      if (term && !(s.nama_simulasi || '').toLowerCase().includes(term)) return false;
      return true;
    });
  }

  // Start a simulasi through the SAME flow as the dedicated simulasi page,
  // so the exam display is identical regardless of entry point.
  startSimulasiFlow(sim: SimulasiUjian): void {
    if (this.startingSimulasiId) return;
    if (sim.can_attempt === false) {
      alert('Batas attempt sudah tercapai untuk simulasi ini.');
      return;
    }
    this.startingSimulasiId = sim.id;
    this.simulasiService.startSimulasi(sim.id).subscribe({
      next: (res) => {
        this.simulasiService.prepareSimulasiSession(sim, res);
        this.startingSimulasiId = null;
        this.router.navigate(['/question']);
      },
      error: (err) => {
        console.error('Failed to start simulasi from home:', err);
        this.startingSimulasiId = null;
        alert(err?.error?.error || 'Gagal memulai simulasi. Silakan coba lagi.');
      },
    });
  }

  getDurationLabel(minutes: number): string {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
    }
    return `${minutes} mnt`;
  }

  // Single source of truth for the grid: mode → jalur → search → sort.
  // Every filter/search/sort action funnels through here so the displayed
  // count and the grid always agree with the active tab.
  private applyFilters(): void {
    let list = this.paketsForMode();

    if (this.selectedCategory) {
      list = list.filter(p => p.kategori_soal === this.selectedCategory);
    }

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(p => (p.nama_paket_soal || '').toLowerCase().includes(term));
    }

    const field = this.sortField;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);

    this.filteredPaketSoalList = list;
  }

  filterByCategory(category: string | null): void {
    this.selectedCategory = category || '';
    this.applyFilters();
  }

  clearFilter(): void {
    this.selectedCategory = '';
    this.applyFilters();
  }

  selectPaketSoal(paketSoal: PaketSoal): void {
    // Check if we have an auth token
    if (!this.authService.getToken()) {
      // Let the auth guard handle redirection
      console.log('No auth token when selecting paket soal');
      return;
    }

    // Simulasi pakets must NEVER use the regular /welcome quiz flow — route them
    // into the proper simulasi exam flow so the display is consistent.
    if (paketSoal.kategori_soal === this.SIMULASI_CAT) {
      const pid = paketSoal.id ?? paketSoal.id_nama_paket_soal;
      const sim = this.simulasiList.find(s => s.paket_soal_id === Number(pid));
      if (sim) {
        this.startSimulasiFlow(sim);
      } else {
        // Simulasi record not loaded/linked — fall back to the simulasi list page.
        this.router.navigate(['/simulasi-ujian']);
      }
      return;
    }

    // If it's a premium quiz, check access specifically for this quiz
    if (paketSoal.is_premium) {
      // Get the correct ID from the paket soal object
      const quizId = paketSoal.id || paketSoal.id_nama_paket_soal;
      console.log('Checking access for premium quiz:', quizId);
      
      // Ensure the quiz ID is valid
      if (!quizId || isNaN(Number(quizId))) {
        console.error('Invalid quiz ID:', paketSoal);
        alert('Error: Invalid quiz ID. Please try another quiz.');
        return;
      }
      
      this.premiumService.checkQuizAccess(Number(quizId)).subscribe({
        next: (response) => {
          console.log('Quiz access response:', response);
          
          // If user has access, proceed to the quiz
          if (response.success && response.has_access) {
            console.log('User has access to premium quiz, proceeding');
            localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
            this.router.navigate(['/welcome']);
          } else {
            // If user doesn't have access, show the premium modal
            console.log('User does not have access to premium quiz, showing modal');
            this.selectedPremiumQuiz = paketSoal;
            this.showPremiumModal = true;
            
            // If there are available plans in the response, update our plans
            if (response.available_plans && response.available_plans.length > 0) {
              this.availablePlans = response.available_plans;
            }
          }
        },
        error: (error) => {
          console.error('Error checking quiz access:', error);
          // Show error message or fallback to general premium check
          if (this.hasPremiumAccess) {
            // If we know user has a subscription, let them proceed
            localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
            this.router.navigate(['/welcome']);
          } else {
            // Otherwise show the premium modal
            this.selectedPremiumQuiz = paketSoal;
            this.showPremiumModal = true;
          }
        }
      });
    } else {
      // For non-premium quizzes, proceed directly
      localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
      this.router.navigate(['/welcome']);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  searchPaketSoal(): void {
    this.applyFilters();
  }

  sortPaketSoal(field: 'nama_paket_soal' | 'jumlah_soal'): void {
    if (this.sortField === field) {
      // If clicking the same field, just toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking different field, update field and keep same direction
      this.sortField = field;
    }
    this.applyFilters();
  }

  filterAndScrollToList(category: string | null): void {
    this.filterByCategory(category);
    
    // Scroll to quiz list
    setTimeout(() => {
      const element = document.getElementById('quiz-list');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  toggleCategories() {
    this.isCategoriesCollapsed = !this.isCategoriesCollapsed;
  }

  // Check if user has premium access
  checkPremiumStatus(): void {
    console.log('Checking premium status...');
    
    // First validate the session to ensure we have a valid token
    this.authService.validateSession().subscribe({
      next: (validationResponse) => {
        if (validationResponse.valid) {
          console.log('Session is valid, proceeding with premium status check');
          
          // Now check premium status
          this.premiumService.checkPremiumStatus().subscribe({
            next: (response) => {
              console.log('Premium status response:', response);
              
              if (response.success) {
                this.hasPremiumAccess = response.is_premium;
                console.log('User has premium access:', this.hasPremiumAccess);
                
                // If available plans are in the response, update them
                if (!this.hasPremiumAccess && response.available_plans) {
                  this.availablePlans = response.available_plans;
                  console.log('Available premium plans from status check:', this.availablePlans);
                }
              } else {
                console.error('Premium status check failed:', response);
                this.hasPremiumAccess = false;
                
                // Still try to load available plans
                this.loadAvailablePlans();
              }
            },
            error: (error) => {
              console.error('Error checking premium status:', error);
              this.hasPremiumAccess = false;
              
              // Still try to load available plans if status check fails
              this.loadAvailablePlans();
            }
          });
        } else {
          console.error('Session is invalid, cannot check premium status');
          this.hasPremiumAccess = false;
          
          // Still try to load available plans
          this.loadAvailablePlans();
        }
      },
      error: (error) => {
        console.error('Error validating session before premium check:', error);
        this.hasPremiumAccess = false;
        
        // Still try to load available plans
        this.loadAvailablePlans();
      }
    });
  }
  
  // Load available premium plans
  loadAvailablePlans(): void {
    console.log('Loading available premium plans...');
    this.premiumService.getPremiumPlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans;
        console.log('Available premium plans:', plans);
      },
      error: (error) => {
        console.error('Error loading premium plans:', error);
        // Set default empty plans array
        this.availablePlans = [];
      }
    });
  }

  // Close premium modal
  closePremiumModal(): void {
    this.showPremiumModal = false;
    this.selectedPremiumQuiz = null;
  }

  estimasiDurasi(jumlahSoal: number): string {
    const menit = Math.round((jumlahSoal * 36) / 60);
    return `±${menit} menit`;
  }

  isNewPaket(paket: PaketSoal): boolean {
    if (!paket.created_at) return false;
    const created = new Date(paket.created_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return created >= sevenDaysAgo;
  }

  // Mode-aware: count pakets of this jalur *within the active mode*, so the
  // chip badge matches exactly what the grid shows when the chip is clicked.
  countForCategory(categoryName: string): number {
    return this.paketsForMode().filter(p => p.kategori_soal === categoryName).length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.activeMode = 'all';
    this.applyFilters();
  }

  dismissStreakBanner(): void {
    this.showStreakBanner = false;
    localStorage.setItem('streakBannerDismissed', Date.now().toString());
  }

  getStreakMessage(): string {
    if (this.streakDays >= 30) return 'Luar biasa! Konsistensi luar biasa!';
    if (this.streakDays >= 14) return 'Hebat! Terus belajar!';
    if (this.streakDays >= 7) return 'Mantap! Kamu di jalur yang benar!';
    if (this.streakDays >= 3) return 'Hebat! Pertahankan streak ini!';
    return '';
  }

  getStreakEmoji(): string {
    if (this.streakDays >= 30) return '🏆';
    if (this.streakDays >= 14) return '🔥';
    if (this.streakDays >= 7) return '💪';
    return '🔥';
  }

  openRandomModal(): void {
    this.showRandomModal = true;
  }

  closeRandomModal(): void {
    this.showRandomModal = false;
    this.isStartingRandom = false;
  }

  startRandomSession(): void {
    if (this.isStartingRandom) return;
    this.isStartingRandom = true;

    const request = {
      count: this.randomCount,
      ...(this.randomCategory ? { category: this.randomCategory } : {})
    };

    this.quizSessionService.startRandomSession(request).subscribe({
      next: (response) => {
        localStorage.setItem('randomSessionData', JSON.stringify(response));
        localStorage.setItem('durasi', String(Math.ceil(response.total_time / 60)));
        localStorage.setItem('quizMode', 'exam');
        this.closeRandomModal();
        this.router.navigate(['/question']);
      },
      error: (error) => {
        console.error('Error starting random session:', error);
        this.isStartingRandom = false;
        alert('Gagal memulai latihan random. Silakan coba lagi.');
      }
    });
  }

  selectHistoryPackage(entry: QuizHistoryEntry): void {
    // Find the matching package in the paketSoalList
    const matchedPackage = this.paketSoalList.find(paket =>
      paket.nama_paket_soal === entry.package_name &&
      paket.kategori_soal === entry.category
    );

    if (matchedPackage) {
      this.selectPaketSoal(matchedPackage);
    } else {
      console.error('Package not found:', entry);
      alert('Paket soal tidak ditemukan. Silakan pilih paket lain.');
    }
  }
}