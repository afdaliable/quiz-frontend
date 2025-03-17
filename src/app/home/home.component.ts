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
  private userSubscription: Subscription | null = null;
  
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
    // Check if we have an auth token
    const token = this.authService.getToken();
    
    console.log('Home Init - Auth token exists:', !!token);
    
    if (token) {
      this.isLoggedIn = true;
      this.loadCategories();
      this.loadPaketSoal();
      this.checkPremiumStatus();
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
        this.checkPremiumStatus();
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

  loadPaketSoal(): void {
    console.log('Loading paket soal...');
    this.questionService.getListPaketSoal().subscribe({
      next: (data: PaketSoal[]) => {
        console.log('Paket soal loaded:', data);
        this.paketSoalList = data;
        this.filteredPaketSoalList = data;
      },
      error: (error) => {
        console.error('Error in home component:', error);
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
        }
      },
      error: (error) => {
        console.error('Error checking premium status:', error);
        this.hasPremiumAccess = false;
        
        // Still try to load available plans if status check fails
        this.loadAvailablePlans();
      }
    });
  }
  
  // Load available premium plans
  loadAvailablePlans(): void {
    this.premiumService.getPremiumPlans().subscribe({
      next: (plans) => {
        this.availablePlans = plans;
        console.log('Available premium plans:', plans);
      },
      error: (error) => {
        console.error('Error loading premium plans:', error);
      }
    });
  }

  // Close premium modal
  closePremiumModal(): void {
    this.showPremiumModal = false;
    this.selectedPremiumQuiz = null;
  }
}