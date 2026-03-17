import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

export interface QuizSession {
  id: string;
  user_id: string;
  paket_soal_id: number | null;
  kategori_soal: string;
  nama_paket_soal: string;
  session_type?: string;
  question_ids?: number[];
  current_question: number;
  answers: (number | null)[];
  marked_questions: boolean[];
  time_remaining: number | null;
  total_time: number | null;
  is_completed: boolean;
  score: number;
  correct_answers: number;
  incorrect_answers: number;
  created_at: string;
  updated_at: string;
}

export interface StartRandomSessionRequest {
  count: number;
  category?: string;
}

export interface StartRandomSessionResponse {
  session_id: string;
  session_type: string;
  nama_paket_soal: string;
  kategori_soal: string;
  total_time: number;
  total_questions: number;
  questions: any[];
}

export interface CreateQuizSessionRequest {
  paket_soal_id: number;
  kategori_soal: string;
  nama_paket_soal: string;
  total_time: number;
}

export interface UpdateQuizSessionRequest {
  current_question?: number;
  answers?: (number | null)[];
  marked_questions?: boolean[];
  time_remaining?: number;
}

export interface CompleteQuizSessionRequest {
  answers: (number | null)[];
  time_remaining: number;
}

export interface CheckExistingSessionResponse {
  exists: boolean;
  session: QuizSession | null;
}

@Injectable({
  providedIn: 'root'
})
export class QuizSessionService {
  private baseApiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  // Get the correct API URL for the endpoint
  private getApiUrl(endpoint: string): string {
    // In production, use the full URL with the domain
    if (environment.production) {
      // Remove leading slash if present
      if (endpoint.startsWith('/')) {
        endpoint = endpoint.substring(1);
      }
      
      // Use window.location.origin to get the base URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/${endpoint}`;
    } else {
      // In development, use the relative URL
      return `/api/${endpoint}`;
    }
  }

  private getHttpOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }),
      withCredentials: true
    };
  }

  private handleError = (error: any) => {
    console.error('QuizSessionService Error:', error);
    if (error.status === 401) {
      localStorage.clear();
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  };

  /**
   * Check if there's an existing active session for this quiz
   */
  checkExistingSession(request: CreateQuizSessionRequest): Observable<CheckExistingSessionResponse> {
    const url = this.getApiUrl('quiz-session/check');
    console.log('Checking existing session for:', request);
    
    return this.http.post<CheckExistingSessionResponse>(url, request, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Existing session check response:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Start a new quiz session
   */
  startQuizSession(request: CreateQuizSessionRequest): Observable<QuizSession> {
    const url = this.getApiUrl('quiz-session/start');
    console.log('Starting quiz session:', request);
    
    return this.http.post<QuizSession>(url, request, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Quiz session started:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific quiz session by ID
   */
  getQuizSession(sessionId: string): Observable<QuizSession> {
    const url = this.getApiUrl(`quiz-session/${sessionId}`);
    console.log('Getting quiz session:', sessionId);
    
    return this.http.get<QuizSession>(url, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Quiz session retrieved:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Save quiz progress (auto-save)
   */
  saveQuizProgress(sessionId: string, request: UpdateQuizSessionRequest): Observable<QuizSession> {
    const url = this.getApiUrl(`quiz-session/${sessionId}/save`);
    
    return this.http.put<QuizSession>(url, request, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Quiz progress saved:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Complete quiz session and get final results
   */
  completeQuizSession(sessionId: string, request: CompleteQuizSessionRequest): Observable<QuizSession> {
    const url = this.getApiUrl(`quiz-session/${sessionId}/complete`);
    console.log('Completing quiz session:', sessionId, request);
    
    return this.http.put<QuizSession>(url, request, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Quiz session completed:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get all active quiz sessions for the current user
   */
  getActiveQuizSessions(): Observable<QuizSession[]> {
    const url = this.getApiUrl('quiz-session/active');
    
    return this.http.get<QuizSession[]>(url, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Active quiz sessions:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get completed quiz sessions for the current user
   */
  getCompletedQuizSessions(limit?: number): Observable<QuizSession[]> {
    let url = this.getApiUrl('quiz-session/completed');
    if (limit) {
      url += `?limit=${limit}`;
    }
    
    return this.http.get<QuizSession[]>(url, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Completed quiz sessions:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a quiz session
   */
  deleteQuizSession(sessionId: string): Observable<void> {
    const url = this.getApiUrl(`quiz-session/${sessionId}`);
    console.log('Deleting quiz session:', sessionId);
    
    return this.http.delete<void>(url, this.getHttpOptions())
      .pipe(
        tap(() => console.log('Quiz session deleted:', sessionId)),
        catchError(this.handleError)
      );
  }

  /**
   * Start a random quiz session
   */
  startRandomSession(request: StartRandomSessionRequest): Observable<StartRandomSessionResponse> {
    const url = this.getApiUrl('quiz-session/start-random');
    console.log('Starting random session:', request);

    return this.http.post<StartRandomSessionResponse>(url, request, this.getHttpOptions())
      .pipe(
        tap(response => console.log('Random session started:', response)),
        catchError(this.handleError)
      );
  }

  /**
   * Initialize or resume a quiz session based on the selected quiz package
   */
  async initializeQuizSession(selectedPaket: any, totalTime: number): Promise<QuizSession> {
    const request: CreateQuizSessionRequest = {
      paket_soal_id: selectedPaket.id || selectedPaket.id_nama_paket_soal,
      kategori_soal: selectedPaket.kategori_soal,
      nama_paket_soal: selectedPaket.nama_paket_soal,
      total_time: totalTime
    };

    // First check if there's an existing session
    try {
      const existingSessionCheck = await this.checkExistingSession(request).toPromise();
      
      if (existingSessionCheck?.exists && existingSessionCheck.session) {
        console.log('Resuming existing quiz session:', existingSessionCheck.session);
        return existingSessionCheck.session;
      }
    } catch (error) {
      console.warn('Could not check existing session, creating new one:', error);
    }

    // Create a new session if no existing session found
    const newSession = await this.startQuizSession(request).toPromise();
    console.log('Created new quiz session:', newSession);
    return newSession!;
  }

  /**
   * Auto-save quiz progress with debouncing
   */
  private autoSaveTimeout: any = null;

  autoSaveProgress(sessionId: string, updateRequest: UpdateQuizSessionRequest): void {
    // Clear any existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Set a new timeout to save after 2 seconds of inactivity
    this.autoSaveTimeout = setTimeout(() => {
      this.saveQuizProgress(sessionId, updateRequest).subscribe({
        next: (session) => {
          console.log('Auto-saved quiz progress:', session.updated_at);
        },
        error: (error) => {
          console.error('Auto-save failed:', error);
          // Store in localStorage as fallback
          this.saveToLocalStorage(sessionId, updateRequest);
        }
      });
    }, 2000);
  }

  /**
   * Fallback: save to localStorage when API is unavailable
   */
  private saveToLocalStorage(sessionId: string, updateRequest: UpdateQuizSessionRequest): void {
    const fallbackData = {
      sessionId,
      ...updateRequest,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('quiz_session_fallback', JSON.stringify(fallbackData));
    console.log('Saved quiz progress to localStorage as fallback');
  }

  /**
   * Restore from localStorage fallback if needed
   */
  getLocalStorageFallback(): any {
    const fallbackData = localStorage.getItem('quiz_session_fallback');
    if (fallbackData) {
      try {
        return JSON.parse(fallbackData);
      } catch (error) {
        console.error('Error parsing localStorage fallback:', error);
        localStorage.removeItem('quiz_session_fallback');
      }
    }
    return null;
  }

  /**
   * Clear localStorage fallback after successful sync
   */
  clearLocalStorageFallback(): void {
    localStorage.removeItem('quiz_session_fallback');
  }
}