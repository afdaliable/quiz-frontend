import { Component, OnInit, OnDestroy } from '@angular/core';
import { Category } from '../models/category.model'; // Ensure this path is correct
import { PaketSoal } from '../models/paket-soal.model' // Ensure this path is correct
import { QuestionService } from '../services/question.service'; // Ensure this path is correct
import { Router } from '@angular/router';
import { UserService } from '../services/user.service'; // Ensure this path is correct
import { ThemeService } from '../services/theme.service'; // Ensure this path is correct
import { AuthService } from '../services/auth.service';
import { PremiumService, PremiumPlan } from '../services/premium.service';
import { Subscription } from 'rxjs';
import { QuizHistoryEntry } from '../models/quiz-history.model';

interface QuizHistoryEntry {
  id: string;
  package_name: string;
  category: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
  duration_seconds: number;
  completed_at: string;
}

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

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private authService: AuthService,
    private premiumService: PremiumService
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
        this.filteredPaketSoalList = data;
        this.isLoading = false;
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

  filterByCategory(category: string | null): void {
    this.selectedCategory = category || '';
    if (!category) {
      // Show all paket soal when no category selected
      this.filteredPaketSoalList = [...this.paketSoalList];
    } else {
      this.filteredPaketSoalList = this.paketSoalList.filter(
        paket => paket.kategori_soal === category
      );
    }
  }

  clearFilter(): void {
    this.selectedCategory = '';
    this.filteredPaketSoalList = this.paketSoalList;
  }

  selectPaketSoal(paketSoal: PaketSoal): void {
    // Check if we have an auth token
    if (!this.authService.getToken()) {
      // Let the auth guard handle redirection
      console.log('No auth token when selecting paket soal');
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
    this.filteredPaketSoalList = this.paketSoalList.filter(paket =>
      paket.nama_paket_soal.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  sortPaketSoal(field: 'nama_paket_soal' | 'jumlah_soal'): void {
    if (this.sortField === field) {
      // If clicking the same field, just toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // If clicking different field, update field and keep same direction
      this.sortField = field;
    }
    
    this.filteredPaketSoalList.sort((a, b) => {
      const compareResult = a[field] > b[field] ? 1 : -1;
      return this.sortDirection === 'asc' ? compareResult : -compareResult;
    });
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

  countForCategory(categoryName: string): number {
    return this.paketSoalList.filter(p => p.kategori_soal === categoryName).length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.filteredPaketSoalList = [...this.paketSoalList];
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