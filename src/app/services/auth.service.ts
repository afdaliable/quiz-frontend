import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  private baseUrl = environment.apiUrl;

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
          const userData = {
            id: response.user.id,
            email: response.user.email,
            display_name: response.user.display_name,
            picture: response.user.picture
          };
          localStorage.setItem('user', JSON.stringify(userData));
          this.setUser(userData);
        }
      }),
      catchError(error => {
        console.error('Token exchange error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setUser(user: any): void {
    this.userSubject.next(user);
  }

  initializeUserState(): void {
    const token = this.getToken();
    if (token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          this.setUser(user);
        } catch (e) {
          console.error('Error parsing user data', e);
          this.logout(); // Clear invalid data
        }
      }
    }
  }
}
