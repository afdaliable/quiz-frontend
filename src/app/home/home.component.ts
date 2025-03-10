import { Component, OnInit } from '@angular/core';
import { Category } from '../models/category.model'; // Ensure this path is correct
import { PaketSoal } from '../models/paket-soal.model' // Ensure this path is correct
import { QuestionService } from '../services/question.service'; // Ensure this path is correct
import { Router } from '@angular/router';
import { UserService } from '../services/user.service'; // Ensure this path is correct
import { ThemeService } from '../services/theme.service'; // Ensure this path is correct

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
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

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('Home Init - Token exists:', !!token);
    console.log('Home Init - User exists:', !!userData);
    
    if (!token || !userData) {
      console.log('Missing credentials, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }
    
    this.userService.setUser(JSON.parse(userData));
    this.isLoggedIn = true;
    this.loadCategories();
    this.loadPaketSoal();
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
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
          localStorage.clear();
          this.router.navigate(['/login']);
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
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
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