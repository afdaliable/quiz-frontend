import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { BookMarkService } from '../services/bookmark.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bookmark-button',
  templateUrl: './bookmark-button.component.html',
  styleUrls: ['./bookmark-button.component.css']
})
export class BookmarkButtonComponent implements OnInit, OnChanges, OnDestroy {
  @Input() questionId!: string;

  isBookmarked: boolean = false;
  isLoading: boolean = false;
  private bookMarkSubscription: Subscription | null = null;

  constructor(private bookMarkService: BookMarkService) {}

  ngOnInit(): void {
    this.syncBookmarkStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId']) {
      this.syncBookmarkStatus();
    }
  }

  ngOnDestroy(): void {
    if (this.bookMarkSubscription) {
      this.bookMarkSubscription.unsubscribe();
    }
  }

  private syncBookmarkStatus(): void {
    if (this.bookMarkSubscription) {
      this.bookMarkSubscription.unsubscribe();
    }
    this.bookMarkSubscription = this.bookMarkService.bookmarks$.subscribe(() => {
      this.isBookmarked = this.bookMarkService.isBookmarked(this.questionId);
    });
  }

  onBookmarkClick(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.bookMarkService.toggleBookmark(this.questionId).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Failed to toggle bookmark:', error);
        this.isLoading = false;
        alert('Gagal menyimpan bookmark. Silakan coba lagi.');
      }
    });
  }

  get buttonLabel(): string {
    return this.isBookmarked ? 'Tersimpan' : 'Simpan';
  }

  get icon(): string {
    return this.isBookmarked ? '🔖' : '📖';
  }
}
