import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    picture?: string;
  };
}

interface SessionValidationResponse {
  valid: boolean;
  userId?: string;
  message?: string;
}

interface Session {
  id: string;
  userId: string;
  createdAt: string;
  lastActive: string;
  userAgent: string;
  ipAddress: string;
  isCurrentSession: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  private baseUrl = environment.apiUrl;
  private sessionInvalidSubject = new BehaviorSubject<boolean>(false);
  sessionInvalid$ = this.sessionInvalidSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeUserState();
  }

  /**
   * Exchanges the authorization code for access token with the backend
   */
  exchangeCodeForToken(code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      environment.production ? 
        `${this.baseUrl}/auth/google/callback` :
        `/api/auth/google/callback`,
      { code },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          // Store refresh token for session management
          if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
          }
          const userData = {
            id: response.user.id,
            email: response.user.email,
            display_name: response.user.display_name,
            picture: response.user.picture
          };
          localStorage.setItem('user', JSON.stringify(userData));
          this.setUser(userData);
          // Reset session invalid flag when successfully logged in
          this.sessionInvalidSubject.next(false);
        }
      }),
      catchError(error => {
        console.error('Token exchange error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logs out the user by calling the backend logout endpoint
   */
  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      // If no refresh token, just clear local storage
      this.clearLocalStorage();
      return of({ success: true });
    }
    
    return this.http.post(
      environment.production ? 
        `${this.baseUrl}/auth/logout` :
        `/api/auth/logout`,
      { token: refreshToken },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      tap(() => {
        this.clearLocalStorage();
      }),
      catchError(error => {
        console.error('Logout error:', error);
        // Even if the server request fails, clear local storage
        this.clearLocalStorage();
        return throwError(() => error);
      })
    );
  }

  /**
   * Clears local storage and resets user state
   */
  private clearLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  // Add this method to allow other components to invalidate the session
  invalidateSession(): void {
    this.sessionInvalidSubject.next(true);
  }

  /**
   * Validates the current session with the backend
   */
  validateSession(): Observable<SessionValidationResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('token');
    
    if (!refreshToken || !accessToken) {
      this.invalidateSession();
      return of({ valid: false, message: 'No session token found' });
    }
    
    return this.http.post<SessionValidationResponse>(
      environment.production ? 
        `${this.baseUrl}/auth/validate-session` :
        `/api/auth/validate-session`,
      { token: refreshToken },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    ).pipe(
      tap(response => {
        if (!response.valid) {
          this.invalidateSession();
          this.clearLocalStorage();
        }
      }),
      catchError(error => {
        console.error('Session validation error:', error);
        // Only invalidate session for auth-related errors
        if (error.status === 401 || error.status === 403) {
          this.invalidateSession();
          this.clearLocalStorage();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Gets all active sessions for the current user
   */
  getUserSessions(): Observable<Session[]> {
    const user = this.getCurrentUser();
    const accessToken = localStorage.getItem('token');
    
    if (!user || !user.id || !accessToken) {
      return of([]);
    }
    
    return this.http.get<Session[]>(
      environment.production ? 
        `${this.baseUrl}/auth/sessions/${user.id}` :
        `/api/auth/sessions/${user.id}`,
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    ).pipe(
      catchError(error => {
        console.error('Get sessions error:', error);
        return throwError(() => error);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  setUser(user: any): void {
    this.userSubject.next(user);
  }

  getCurrentUser(): any {
    return this.userSubject.getValue();
  }

  initializeUserState(): void {
    const token = this.getToken();
    if (token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          this.setUser(user);
          // Validate the session on initialization
          this.validateSession().subscribe();
        } catch (e) {
          console.error('Error parsing user data', e);
          this.clearLocalStorage(); // Clear invalid data
        }
      }
    }
  }
}
