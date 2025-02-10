import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  private baseUrl = environment.apiUrl; // Add this line

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<AuthResponse> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');

    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/v1/token`, 
      credentials,
      { 
        headers,
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          const userData = {
            id: response.user.id,
            email: response.user.email,
            display_name: response.user.display_name || response.user.email.split('@')[0]
          };
          localStorage.setItem('user', JSON.stringify(userData));
          this.setUser(userData);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  signUp(email: string, password: string, display_name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/signup`,
      { email, password, display_name },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          const userData = {
            id: response.user.id,
            email: response.user.email,
            display_name: response.user.display_name
          };
          localStorage.setItem('user', JSON.stringify(userData));
          this.userSubject.next(userData);
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }
  logout(): void {
    localStorage.removeItem('token');
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
      // You might want to validate the token or fetch user data from the server here
      // For now, we'll just set a basic user object
      this.setUser({ display_name: 'User' });
    }
  }
}
