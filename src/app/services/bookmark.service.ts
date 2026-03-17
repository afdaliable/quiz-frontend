import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Shape dari backend endpoint GET /api/bookmarks
interface BackendBookmarkedQuestion {
  id: string;
  question_id: number;
  soal: string;
  opt1: string | null;
  opt2: string | null;
  opt3: string | null;
  opt4: string | null;
  opt5: string | null;
  correct_answer: string | null;
  solution: string | null;
  modul: string | null;
  pelajaran: string | null;
  tag: string | null;
  question_type: string | null;
  created_at: string;
}

export interface BookmarkQuestion {
  id: string;           // bookmark UUID
  question_id: number;  // integer question ID (dipakai untuk API call)
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

  private get apiBase(): string {
    return `${environment.apiUrl}/bookmarks`;
  }

  constructor(private http: HttpClient) {
    this.loadBookmarks();
  }

  getAllBookmarks(): Observable<string[]> {
    return this.bookmarks$;
  }

  isBookmarked(questionId: string): boolean {
    return this.bookmarksSubject.value.includes(questionId);
  }

  toggleBookmark(questionId: string): Observable<any> {
    if (this.isBookmarked(questionId)) {
      return this.removeBookmark(questionId);
    }
    return this.http.post<any>(`${this.apiBase}/${questionId}`, null).pipe(
      tap(() => this.loadBookmarks())
    );
  }

  private loadBookmarks(): void {
    const localBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    this.fetchAllBookmarks().subscribe({
      next: (serverBookmarks) => {
        const merged = [...new Set([...localBookmarks, ...serverBookmarks])];
        this.bookmarksSubject.next(Array.from(merged));
      },
      error: () => {
        this.bookmarksSubject.next(localBookmarks);
      }
    });
  }

  fetchAllBookmarks(): Observable<string[]> {
    return this.http.get<BackendBookmarkedQuestion[]>(this.apiBase).pipe(
      map(questions => questions.map(q => String(q.question_id)))
    );
  }

  fetchAllBookmarkQuestions(): Observable<BookmarkQuestion[]> {
    return this.http.get<BackendBookmarkedQuestion[]>(this.apiBase).pipe(
      map(questions => questions.map(q => this.mapToFrontend(q)))
    );
  }

  removeBookmark(questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${questionId}`).pipe(
      tap(() => this.loadBookmarks())
    );
  }

  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(
      map(bookmarks => bookmarks.length)
    );
  }

  private mapToFrontend(q: BackendBookmarkedQuestion): BookmarkQuestion {
    const opts = [q.opt1, q.opt2, q.opt3, q.opt4, q.opt5].filter((o): o is string => o != null);
    return {
      id: q.id,
      question_id: q.question_id,
      questionText: q.soal,
      options: opts.map(text => ({
        text,
        correct: text === q.correct_answer
      })),
      question_type: q.question_type ?? 'multiple_choice',
      solution: q.solution ?? '',
      category: q.pelajaran ?? q.tag ?? '',
      package_name: q.modul ?? ''
    };
  }
}
