import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token check for login and callback endpoints
    if (request.url.includes('/auth/google/callback') || request.url.includes('api/auth/google/callback') || 
        request.method === 'OPTIONS') {
      return next.handle(request);
    }

    // Get the auth token
    const token = this.authService.getToken();
    
    if (!token) {
      // For API requests that require authentication, redirect to login
      if (request.url.includes(environment.apiUrl) && 
          !request.url.includes('/public')) {
        console.log('No token found, redirecting to login');
        this.router.navigate(['/login']);
        return throwError(() => new Error('No authentication token found'));
      }
      
      // For public endpoints, proceed without token
      return next.handle(request);
    }

    // Clone the request with auth token
    request = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: environment.withCredentials
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          console.error('CORS or Network error:', error);
          return throwError(() => new Error('Network error occurred'));
        }
        if (error.status === 401) {
          // Token expired or invalid, logout and redirect
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
