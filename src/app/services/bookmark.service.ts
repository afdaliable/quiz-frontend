import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BookmarkQuestion {
  id: string;
  questionText: string;
  options: Array<{
    text: string;
    correct: boolean;
  }>;
  question_type: string;
  solution: string;
  category: string;
  package_name: string;
}

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
   * Get all bookmarks (question IDs)
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
    return this.http.post<void>(
      environment.production ?
        `${environment.apiUrl}/bookmarks/${questionId}` :
        `/api/bookmarks/${questionId}`,
      null
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
      const merged = [...new Set([...localBookmarks, ...serverBookmarks])];
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
   * Fetch all bookmarked questions with full details
   */
  fetchAllBookmarkQuestions(): Observable<BookmarkQuestion[]> {
    return this.http.get<BookmarkQuestion[]>(
      environment.production ?
        `${environment.apiUrl}/bookmarks/questions` :
        '/api/bookmarks/questions'
    );
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(questionId: string): Observable<void> {
    return this.http.delete<void>(
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
   * Get count of bookmarks
   */
  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.length)
    );
  }
}
