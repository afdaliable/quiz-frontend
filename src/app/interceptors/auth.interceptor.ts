import { Injectable, Injector } from '@angular/core';
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
  private authService!: AuthService;

  constructor(private router: Router, private injector: Injector) {}

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

    // Lazily get the auth service to avoid circular dependency
    if (!this.authService) {
      this.authService = this.injector.get(AuthService);
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

    // Add user_id to headers for premium and payment endpoints
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Preserve existing User_id header if present
    if (request.headers.has('User_id')) {
      const userId = request.headers.get('User_id');
      headers = headers.set('User_id', userId!);
      console.log('Preserved existing User_id header:', userId);
    }

    // Add user_id header for premium, payment, and user endpoints
    if (request.url.includes('/premium/') || 
        request.url.includes('/payment/') || 
        request.url.includes('/user/update-phone') ||
        request.url.includes('/license/')) {
      const user = this.authService.getCurrentUser();
      if (user && user.id) {
        headers = headers.set('user_id', user.id.toString());
        // Also add User_id with capital U as expected by some backend endpoints
        if (!headers.has('User_id')) {
          headers = headers.set('User_id', user.id.toString());
        }
        console.log('Added user_id and User_id headers for endpoint:', user.id);
      } else {
        console.warn('User ID not available for request to:', request.url);
      }
    }

    // Clone the request with headers
    request = request.clone({
      headers: headers,
      withCredentials: environment.withCredentials
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          console.error('CORS or Network error:', error);
          return throwError(() => new Error('Network error occurred'));
        }
        
        // Special handling for premium endpoints
        if (error.status === 401 && (
            request.url.includes('/premium/') ||
            request.url.includes('/payment/')
          )) {
          console.log('401 on premium endpoint, attempting session validation');
          
          // For premium status check specifically, try to validate the session first
          if (request.url.includes('/premium/check-status')) {
            return this.authService.validateSession().pipe(
              switchMap(response => {
                if (response.valid) {
                  console.log('Session validated, retrying premium request');
                  // Session is valid, retry the request with fresh headers
                  const freshToken = this.authService.getToken();
                  let freshHeaders = new HttpHeaders({
                    'Authorization': `Bearer ${freshToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  });
                  
                  const user = this.authService.getCurrentUser();
                  if (user && user.id) {
                    freshHeaders = freshHeaders.set('user_id', user.id.toString());
                    freshHeaders = freshHeaders.set('User_id', user.id.toString());
                  }
                  
                  const retryRequest = request.clone({
                    headers: freshHeaders
                  });
                  
                  return next.handle(retryRequest);
                } else {
                  // Session is invalid, redirect to login
                  this.authService.logout().subscribe();
                  this.router.navigate(['/login']);
                  return throwError(() => new Error('Session invalid or expired'));
                }
              }),
              catchError(validationError => {
                console.error('Session validation failed:', validationError);
                this.authService.logout().subscribe();
                this.router.navigate(['/login']);
                return throwError(() => new Error('Session validation failed'));
              })
            );
          }
          
          // For other premium endpoints, just return the error
          return throwError(() => error);
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
            let headers = new HttpHeaders({
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            });

            // Add user_id header for premium and payment endpoints
            if (request.url.includes('/premium/') || request.url.includes('/payment/')) {
              const user = this.authService.getCurrentUser();
              if (user && user.id) {
                headers = headers.set('user_id', user.id.toString());
                headers = headers.set('User_id', user.id.toString());
              }
            }

            const clonedRequest = request.clone({
              headers: headers
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
