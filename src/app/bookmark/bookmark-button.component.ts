import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { BookMarkService } from '../services/bookmark.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bookmark-button',
  template: './bookmark-button.component.html',
  styleUrls: ['./bookmark-button.component.css']
})
export class BookmarkButtonComponent implements OnChanges, OnDestroy {
  @Input() questionId!: string;

  isBookmarked: boolean = false;
  isLoading: boolean = false;
  private bookMarkSubscription: Subscription | null = null;

  constructor(private bookMarkService: BookMarkService) {}

  ngOnInit(): void {
    this.bookMarkSubscription = this.bookMarkService.isBookmarked(this.questionId).subscribe(isBookmarked => {
      this.isBookmarked = isBookmarked;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.questionId && !changes.firstChange) {
      // Refresh bookmark status when question ID changes
      this.bookMarkSubscription = this.bookMarkService.isBookmarked(this.questionId).subscribe(isBookmarked => {
        this.isBookmarked = isBookmarked;
      });
    }
  }

  ngOnDestroy(): void {
    if (this.bookMarkSubscription) {
      this.bookMarkSubscription.unsubscribe();
    }
  }

  /**
   * Toggle bookmark status
   */
  onBookmarkClick(): void {
    if (this.isLoading) return;

    this.isLoading = true;

    this.bookMarkService.toggleBookmark(this.questionId).subscribe({
      next: () => {
        this.isBookmarked = !this.isBookmarked;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to toggle bookmark:', error);
        this.isLoading = false;
        alert('Gagal menyimpan bookmark. Silakan coba lagi.');
      }
    });
  }

  /**
   * Get button label
   */
  get buttonLabel(): string {
    return this.isBookmarked ? 'Tersimpan' : 'Simpan';
  }

  /**
   * Get icon emoji
   */
  get icon(): string {
    return this.isBookmarked ? '🔖' : '📖';
  }
}
