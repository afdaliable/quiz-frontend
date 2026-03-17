import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Shape dari backend endpoint GET /api/bookmarks (AFD-85)
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
  bookmarked_at: string | null;
  quiz_name: string;
  question_number: number;
}

interface BookmarkListResponse {
  bookmarks: BackendBookmarkedQuestion[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BookmarkQuestion {
  id: string;           // UUID bookmark record
  question_id: number;  // integer question ID (dipakai untuk API call)
  questionText: string;
  options: Array<{
    text: string;
    correct: boolean;
  }>;
  question_type: string;
  solution: string;
  category: string;      // pelajaran
  package_name: string;  // quiz_name
  question_number: number;
  bookmarked_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BookMarkService {
  private bookmarksSubject = new BehaviorSubject<string[]>([]);
  bookmarks$ = this.bookmarksSubject.asObservable();

  private get apiBase(): string {
    return environment.production ? `${environment.apiUrl}/bookmarks` : '/api/bookmarks';
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

  loadBookmarks(): void {
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
    return this.http.get<any>(`${this.apiBase}?limit=500`).pipe(
      map(res => {
        const list: BackendBookmarkedQuestion[] = Array.isArray(res) ? res : (res?.bookmarks ?? []);
        return list.map(q => String(q.question_id));
      })
    );
  }

  fetchAllBookmarkQuestions(sortBy: string = 'created_at', sortOrder: string = 'desc'): Observable<BookmarkQuestion[]> {
    const url = `${this.apiBase}?limit=500&sort_by=${sortBy}&sort_order=${sortOrder}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        const list: BackendBookmarkedQuestion[] = Array.isArray(res) ? res : (res?.bookmarks ?? []);
        return list.map(q => this.mapToFrontend(q));
      })
    );
  }

  removeBookmark(questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/${questionId}`).pipe(
      tap(() => this.loadBookmarks())
    );
  }

  bulkDeleteBookmarks(questionIds: number[]): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/bulk`, {
      body: { question_ids: questionIds }
    }).pipe(
      tap(() => this.loadBookmarks())
    );
  }

  getBookmarkCount(): Observable<number> {
    return this.bookmarks$.pipe(map(b => b.length));
  }

  private mapToFrontend(q: BackendBookmarkedQuestion): BookmarkQuestion {
    const optTexts = [q.opt1, q.opt2, q.opt3, q.opt4, q.opt5].filter((o): o is string => o != null);
    const correctAnswer = (q.correct_answer ?? '').trim();

    return {
      id: q.id,
      question_id: q.question_id,
      questionText: q.soal,
      // correct_answer menyimpan teks jawaban, bukan huruf A/B/C
      options: optTexts.map(text => ({ text, correct: text === correctAnswer })),
      question_type: q.question_type ?? 'multiple_choice',
      solution: q.solution ?? '',
      category: q.pelajaran ?? q.tag ?? '',
      package_name: q.modul ?? q.quiz_name ?? '',  // modul lebih akurat untuk lokasi soal
      question_number: q.question_number ?? 0,
      bookmarked_at: q.bookmarked_at ?? null,
    };
  }
}
