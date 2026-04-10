import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ThemeService } from '../services/theme.service';
import { SearchService, SoalSearchResult, SearchFilters } from '../services/search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
  query = '';
  results: SoalSearchResult[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;
  error = '';
  selectedModul = '';
  selectedPelajaran = '';
  filters: SearchFilters = { modul: [], pelajaran: [] };
  isDarkMode = false;

  // Toast
  toastMessage = '';
  toastVisible = false;
  private toastTimer: any = null;

  private querySubject = new Subject<string>();
  private themeSubscription: Subscription | null = null;
  private querySubscription: Subscription | null = null;

  constructor(
    private searchService: SearchService,
    private themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkMode$.subscribe(
      isDark => (this.isDarkMode = isDark)
    );

    // Load filter options
    this.searchService.getFilters().subscribe(f => (this.filters = f));

    // Debounce search input
    this.querySubscription = this.querySubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        this.doSearch();
      });

    // Support deep-link: /search?q=keyword
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.query = params['q'];
        this.page = 1;
        this.doSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
    this.querySubscription?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  onQueryChange(): void {
    this.querySubject.next(this.query);
  }

  clearQuery(): void {
    this.query = '';
    this.results = [];
    this.total = 0;
    this.page = 1;
    this.querySubject.next('');
  }

  onFilterChange(): void {
    this.page = 1;
    this.doSearch();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.doSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  pageNumbers(): number[] {
    const total = this.totalPages();
    const pages: number[] = [];
    const start = Math.max(1, this.page - 2);
    const end = Math.min(total, this.page + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  private doSearch(): void {
    if (!this.query.trim() && !this.selectedModul && !this.selectedPelajaran) {
      this.results = [];
      this.total = 0;
      this.loading = false;
      return;
    }
    this.loading = true;
    this.error = '';
    this.searchService
      .search(this.query, this.selectedModul, this.selectedPelajaran, this.page, this.limit)
      .subscribe({
        next: res => {
          this.results = res.results;
          this.total = res.total;
          this.loading = false;
        },
        error: () => {
          this.error = 'Gagal memuat hasil pencarian. Coba lagi.';
          this.loading = false;
        }
      });
  }

  goToPackage(result: SoalSearchResult): void {
    if (!result.nama_paket_soal || !result.kategori_soal) {
      this.showToast('Soal ini tidak terdapat dalam paket manapun');
      return;
    }
    const selectedPaket = {
      id: result.id,
      id_nama_paket_soal: result.id,
      nama_paket_soal: result.nama_paket_soal,
      kategori_soal: result.kategori_soal,
      jumlah_soal: 0,
      is_premium: false
    };
    localStorage.setItem('selectedPaket', JSON.stringify(selectedPaket));
    localStorage.setItem('quizMode', 'exam');
    this.router.navigate(['/question']);
  }

  snippetOf(soal: string): string {
    const plain = soal.replace(/<[^>]*>/g, '');
    return plain.length > 150 ? plain.slice(0, 150) + '…' : plain;
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  private showToast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => (this.toastVisible = false), 2500);
  }
}
