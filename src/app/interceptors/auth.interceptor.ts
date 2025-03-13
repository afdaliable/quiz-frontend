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
import { catchError, switchMap, take, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token check for login, callback, logout, and validate-session endpoints
    if (request.url.includes('/auth/google/callback') || 
        request.url.includes('api/auth/google/callback') || 
        request.url.includes('/auth/logout') || 
        request.url.includes('api/auth/logout') ||
        request.url.includes('/auth/validate-session') || 
        request.url.includes('api/auth/validate-session') ||
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
          // Token expired or invalid, validate session
          return this.handleUnauthorizedError(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handleUnauthorizedError(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip validation for certain endpoints to avoid infinite loops
    if (request.url.includes('/auth/validate-session') || 
        request.url.includes('api/auth/validate-session')) {
      // For validation endpoint itself, just propagate the error
      this.authService.invalidateSession();
      this.authService.logout().subscribe();
      this.router.navigate(['/invalid-session']);
      return throwError(() => new Error('Session invalid or expired'));
    }
    
    // For other endpoints, validate the session
    return this.authService.validateSession().pipe(
      switchMap(response => {
        if (response.valid) {
          // If session is valid but token expired, we could implement token refresh here
          // For now, just retry the request
          const token = this.authService.getToken();
          if (token) {
            const clonedRequest = request.clone({
              setHeaders: {
                'Authorization': `Bearer ${token}`
              }
            });
            return next.handle(clonedRequest);
          }
        }
        
        // If session is invalid, logout and redirect to invalid session page
        this.authService.logout().subscribe();
        this.router.navigate(['/invalid-session']);
        return throwError(() => new Error('Session invalid or expired'));
      }),
      catchError(error => {
        // If validation fails, logout and redirect to invalid session page
        this.authService.logout().subscribe();
        this.router.navigate(['/invalid-session']);
        return throwError(() => error);
      })
    );
  }
}
