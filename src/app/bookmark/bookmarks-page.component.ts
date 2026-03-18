import { Component, OnInit, OnDestroy } from '@angular/core';
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
  isDarkMode: boolean = false;
  isLoading: boolean = false;

  // Delete confirmation
  deleteTarget: BookmarkQuestion | null = null;
  isDeleting: boolean = false;

  // Toast
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastSuccess: boolean = true;
  private toastTimer: any = null;

  // Fade-out animation tracking (single delete)
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

  loadBookmarks(): void {
    this.isLoading = true;
    this.bookMarkService.fetchAllBookmarkQuestions().subscribe({
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
    if (this.selectedCategory === 'all') {
      this.filteredBookmarks = [...this.bookmarks];
    } else {
      this.filteredBookmarks = this.bookmarks.filter(b => b.category === this.selectedCategory);
    }
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilter();
  }

  getCategories(): string[] {
    const cats = new Set(this.bookmarks.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort();
  }

  getCategoryCount(category: string): number {
    return this.bookmarks.filter(b => b.category === category).length;
  }

  getOptionLabel(index: number): string {
    return ['A', 'B', 'C', 'D', 'E'][index] || String(index + 1);
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

  isFadingOut(question: BookmarkQuestion): boolean {
    return this.fadingOutIds.has(String(question.question_id));
  }

  // ── Latihan dari Bookmark ───────────────────────────────────────────────────

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
        explanation: b.solution || '',
        question_type: 'multiple_choice'
      }))
    };

    localStorage.setItem('bookmarkQuizData', JSON.stringify(bookmarkQuizData));
    localStorage.setItem('quizMode', 'study');
    localStorage.setItem('durasi', '0');
    this.router.navigate(['/question']);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  private showToast(message: string, success: boolean): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastSuccess = success;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
  }
}
