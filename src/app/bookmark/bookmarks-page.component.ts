import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { BookMarkService, BookmarkQuestion } from '../services/bookmark.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-bookmarks-page',
  templateUrl: './bookmarks-page.component.html',
  styleUrls: ['./bookmarks-page.component.css']
})
export class BookmarksPageComponent implements OnInit, OnDestroy {
  bookmarks: BookmarkQuestion[] = [];
  filteredBookmarks: BookmarkQuestion[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';
  isDarkMode: boolean = false;
  isLoading: boolean = false;

  // Sort
  sortBy: string = 'created_at';
  sortOrder: string = 'desc';
  showSortMenu: boolean = false;

  // View
  viewMode: 'grid' | 'list' = 'grid';

  // Delete confirmation
  deleteTarget: BookmarkQuestion | null = null;
  isDeleting: boolean = false;

  // Toast
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastSuccess: boolean = true;
  private toastTimer: any = null;

  // Bulk select
  selectedIds: Set<string> = new Set();
  isBulkDeleting: boolean = false;

  // Fade-out animation tracking
  fadingOutIds: Set<string> = new Set();

  private themeSubscription: Subscription | null = null;

  constructor(
    private bookMarkService: BookMarkService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);
    this.loadBookmarks();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) this.themeSubscription.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sort-menu-container')) {
      this.showSortMenu = false;
    }
  }

  loadBookmarks(): void {
    this.isLoading = true;
    this.bookMarkService.fetchAllBookmarkQuestions(this.sortBy, this.sortOrder).subscribe({
      next: (bookmarks) => {
        this.bookmarks = bookmarks;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load bookmarks:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    let result = [...this.bookmarks];
    if (this.selectedCategory !== 'all') {
      result = result.filter(b => b.category === this.selectedCategory);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(b =>
        b.questionText.toLowerCase().includes(term) ||
        (b.package_name || '').toLowerCase().includes(term) ||
        (b.category || '').toLowerCase().includes(term)
      );
    }
    this.filteredBookmarks = result;
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.selectedIds.clear();
    this.applyFilter();
  }

  searchBookmarks(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilter();
  }

  setSortBy(sortBy: string, sortOrder: string): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.showSortMenu = false;
    this.loadBookmarks();
  }

  getSortLabel(): string {
    if (this.sortBy === 'pelajaran') return 'Berdasarkan Subject';
    return this.sortOrder === 'asc' ? 'Terlama' : 'Terbaru';
  }

  getCategories(): string[] {
    const cats = new Set(this.bookmarks.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort();
  }

  getCategoryCount(category: string): number {
    return this.bookmarks.filter(b => b.category === category).length;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  confirmDelete(question: BookmarkQuestion, event: Event): void {
    event.stopPropagation();
    this.deleteTarget = question;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget || this.isDeleting) return;
    const target = this.deleteTarget;
    this.deleteTarget = null;
    this.isDeleting = true;
    const qidStr = String(target.question_id);

    this.fadingOutIds.add(qidStr);

    setTimeout(() => {
      this.bookMarkService.removeBookmark(qidStr).subscribe({
        next: () => {
          this.bookmarks = this.bookmarks.filter(b => b.question_id !== target.question_id);
          this.fadingOutIds.delete(qidStr);
          this.applyFilter();
          this.showToast('Bookmark berhasil dihapus', true);
          this.isDeleting = false;
        },
        error: () => {
          this.fadingOutIds.delete(qidStr);
          this.showToast('Gagal menghapus bookmark', false);
          this.isDeleting = false;
        }
      });
    }, 280);
  }

  // ── Bulk Select ────────────────────────────────────────────────────────────

  toggleSelect(questionId: number, event: Event): void {
    event.stopPropagation();
    const id = String(questionId);
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedIds.clear();
    } else {
      this.selectedIds = new Set(this.filteredBookmarks.map(b => String(b.question_id)));
    }
  }

  get isAllSelected(): boolean {
    return this.filteredBookmarks.length > 0 && this.selectedIds.size === this.filteredBookmarks.length;
  }

  bulkDelete(): void {
    if (this.selectedIds.size === 0 || this.isBulkDeleting) return;
    const count = this.selectedIds.size;
    const ids = Array.from(this.selectedIds).map(id => parseInt(id, 10));
    this.isBulkDeleting = true;
    this.selectedIds.forEach(id => this.fadingOutIds.add(id));

    setTimeout(() => {
      this.bookMarkService.bulkDeleteBookmarks(ids).subscribe({
        next: () => {
          this.bookmarks = this.bookmarks.filter(b => !ids.includes(b.question_id));
          this.fadingOutIds.clear();
          this.selectedIds.clear();
          this.applyFilter();
          this.showToast(`${count} bookmark berhasil dihapus`, true);
          this.isBulkDeleting = false;
        },
        error: () => {
          this.fadingOutIds.clear();
          this.showToast('Gagal menghapus bookmark', false);
          this.isBulkDeleting = false;
        }
      });
    }, 280);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  isFadingOut(question: BookmarkQuestion): boolean {
    return this.fadingOutIds.has(String(question.question_id));
  }

  isSelected(question: BookmarkQuestion): boolean {
    return this.selectedIds.has(String(question.question_id));
  }

  hasCorrectAnswer(bookmark: BookmarkQuestion): boolean {
    return bookmark.options.some(o => o.correct);
  }

  relativeTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 30) return `${diffDays} hari lalu`;
    return `${Math.floor(diffDays / 30)} bulan lalu`;
  }

  startQuizFromBookmarks(): void {
    const source = this.filteredBookmarks.length > 0 ? this.filteredBookmarks : this.bookmarks;
    if (source.length === 0) return;

    const bookmarkQuizData = {
      nama_paket_soal: this.selectedCategory !== 'all'
        ? `Bookmark · ${this.selectedCategory}`
        : 'Latihan Bookmark',
      kategori_soal: this.selectedCategory !== 'all' ? this.selectedCategory : 'Bookmark',
      questions: source.map(b => ({
        id: b.question_id,
        questionText: b.questionText,
        options: b.options,
        explanation: '',
        question_type: 'multiple_choice'
      }))
    };

    localStorage.setItem('bookmarkQuizData', JSON.stringify(bookmarkQuizData));
    localStorage.setItem('quizMode', 'study');
    localStorage.setItem('durasi', '0');
    this.router.navigate(['/question']);
  }

  selectQuestion(question: BookmarkQuestion): void {
    localStorage.setItem('selectedBookmark', JSON.stringify(question));
    this.router.navigate(['/review']);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  private showToast(message: string, success: boolean): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastSuccess = success;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
  }
}
