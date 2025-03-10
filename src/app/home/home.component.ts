import { Component, OnInit, OnDestroy } from '@angular/core';
import { Category } from '../models/category.model'; // Ensure this path is correct
import { PaketSoal } from '../models/paket-soal.model' // Ensure this path is correct
import { QuestionService } from '../services/question.service'; // Ensure this path is correct
import { Router } from '@angular/router';
import { UserService } from '../services/user.service'; // Ensure this path is correct
import { ThemeService } from '../services/theme.service'; // Ensure this path is correct
import { SupabaseService } from '../services/supabase.service';
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
  private sessionSubscription: Subscription | null = null;

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    // Check if we have a Supabase session
    const session = this.supabaseService.currentSession;
    
    console.log('Home Init - Supabase session exists:', !!session);
    
    if (session) {
      this.isLoggedIn = true;
      this.loadCategories();
      this.loadPaketSoal();
    } else {
      // Don't redirect here, let the auth guard handle it
      console.log('No Supabase session in home component');
    }
    
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Subscribe to session changes
    this.sessionSubscription = this.supabaseService.session$.subscribe(session => {
      this.isLoggedIn = !!session;
      
      if (session) {
        this.loadCategories();
        this.loadPaketSoal();
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
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
    // Check if we have a Supabase session
    if (!this.supabaseService.currentSession) {
      // Let the auth guard handle redirection
      console.log('No Supabase session when selecting paket soal');
      return;
    }
    
    localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
    this.router.navigate(['/welcome']);
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
}