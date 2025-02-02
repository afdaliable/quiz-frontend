import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  signUp(email: string, password: string, display_name: string): Observable<any> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const body = {
      email,
      password,
      display_name
    };

    return this.http.post(`${this.baseUrl}/signup`, body, { headers })
      .pipe(
        catchError(error => {
          console.error('Signup error:', error);
          if (error.status === 0) {
            return throwError(() => new Error('Network error - please check your connection'));
          }
          return throwError(() => error);
        }),
        tap((response: any) => {
          if (response?.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        })
      );
  }

  signIn(email: string, password: string): Observable<any> {
    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    const body = {
      email,
      password,
      grant_type: 'password'
    };

    return this.http.post(`${this.baseUrl}/auth/v1/token`, body, { headers })
      .pipe(
        catchError(error => {
          console.error('Login error:', error);
          if (error.status === 0) {
            return throwError(() => new Error('Network error - please check your connection'));
          }
          return throwError(() => error);
        }),
        tap((response: any) => {
          if (response?.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        })
      );
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
