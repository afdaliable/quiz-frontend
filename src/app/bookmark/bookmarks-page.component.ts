import { Component, OnInit, OnDestroy } from '@angular/core';
import { BookMarkService, BookmarkQuestion } from '../services/bookmark.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
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
  private bookmarkSubscription: Subscription | null = null;
  private themeSubscription: Subscription | null = null;

  categories: string[] = ['matematika', 'bahasa', 'sains', 'ipa', 'ips', 'sejarah', 'geografi', 'ekonomi', 'biologi', 'fisika', 'kimia', 'komputer', 'teknologi'];

  constructor(
    private bookMarkService: BookMarkService,
    private router: Router,
    private themeService: ThemeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);
    this.loadBookmarks();
  }

  ngOnDestroy(): void {
    if (this.bookmarkSubscription) {
      this.bookmarkSubscription.unsubscribe();
    }
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  loadBookmarks(): void {
    this.isLoading = true;
    this.bookMarkService.fetchAllBookmarkQuestions().subscribe({
      next: (bookmarks: BookmarkQuestion[]) => {
        this.bookmarks = bookmarks;
        this.filteredBookmarks = bookmarks;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load bookmarks:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Filter by category
   */
  filterByCategory(category: string): void {
    this.selectedCategory = category;
    if (category === 'all') {
      this.filteredBookmarks = this.bookmarks;
    } else {
      this.filteredBookmarks = this.bookmarks.filter(b =>
        b.category === category
      );
    }
  }

  /**
   * Search by question text
   */
  searchBookmarks(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredBookmarks = this.bookmarks.filter(b =>
      b.questionText.toLowerCase().includes(term) ||
      b.package_name.toLowerCase().includes(term)
    );
  }

  /**
   * Select bookmarked question
   */
  selectQuestion(question: BookmarkQuestion): void {
    // Store selected question for review
    localStorage.setItem('selectedBookmark', JSON.stringify(question));
    this.router.navigate(['/review'], {
      queryParams: {
        questionId: question.id
      }
    });
  }

  /**
   * Get unique categories from bookmarks
   */
  getCategories(): string[] {
    const uniqueCategories = new Set(this.bookmarks.map(b => b.category));
    return Array.from(uniqueCategories);
  }

  /**
   * Get bookmarked questions count for category
   */
  getCategoryCount(category: string): number {
    return this.bookmarks.filter(b => b.category === category).length;
  }

  /**
   * Remove from bookmarks
   */
  removeFromBookmarks(question: BookmarkQuestion): void {
    this.bookMarkService.removeBookmark(String(question.question_id)).subscribe({
      next: () => {
        this.loadBookmarks();
      },
      error: (error) => {
        console.error('Failed to remove bookmark:', error);
      }
    });
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.filteredBookmarks = this.bookmarks;
  }
}
