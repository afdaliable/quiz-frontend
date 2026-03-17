import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookMarkService {
  private bookmarksSubject = new BehaviorSubject<string[]>([]);
  bookmarks$ = this.bookmarksSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadBookmarks();
  }

  /**
   * Get all bookmarks
   */
  getAllBookmarks(): Observable<string[]> {
    return this.bookmarks$;
  }

  /**
   * Check if a question is bookmarked
   */
  isBookmarked(questionId: string): boolean {
    return this.bookmarksSubject.value.includes(questionId);
  }

  /**
   * Toggle bookmark status for a question
   */
  toggleBookmark(questionId: string): Observable<void> {
    return this.http.post<any>(
      environment.production ?
        `${environment.apiUrl}/bookmarks/${questionId}` :
        `/api/bookmarks/${questionId}`
    ).pipe(
      tap(() => {
        this.loadBookmarks();
      })
    );
  }

  /**
   * Load bookmarks from localStorage and fetch from server
   */
  private loadBookmarks(): void {
    // Load from localStorage first
    const localBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');

    // Fetch from server to sync
    this.fetchAllBookmarks().subscribe(serverBookmarks => {
      // Merge local and server bookmarks
      const merged = [...new Set([...localBookmarks]), ...new Set(serverBookmarks)];
      this.bookmarksSubject.next(Array.from(merged));
    });
  }

  /**
   * Fetch all bookmarks from server
   */
  fetchAllBookmarks(): Observable<string[]> {
    return this.http.get<string[]>(
      environment.production ?
        `${environment.apiUrl}/bookmarks` :
        '/api/bookmarks'
    );
  }

  /**
   * Get count of bookmarks
   */
  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.length)
    );
  }
}
