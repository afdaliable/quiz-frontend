import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token check for login and signup endpoints
    if (request.url.includes('/auth/v1/token') || 
        request.url.includes('/signup') || 
        request.method === 'OPTIONS') {
      return next.handle(request);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      this.router.navigate(['/login']);
      return throwError(() => new Error('No token found'));
    }

    // Clone the request with CORS headers
    request = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://kuis.canducation.com'
      },
      withCredentials: true
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          console.error('CORS or Network error:', error);
          // Optionally refresh the page or retry the request
          return throwError(() => new Error('Network error occurred'));
        }
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
