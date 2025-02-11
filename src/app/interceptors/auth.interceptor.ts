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
    console.log('Full request details:', {
      url: request.url,
      method: request.method,
      headers: request.headers.keys(),
      withCredentials: request.withCredentials
    });
    // Skip for OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      return next.handle(request);
    }

    // Skip for auth endpoints
    if (request.url.includes('/auth/v1/token') || request.url.includes('/signup')) {
      console.log('Skipping auth endpoint');
      return next.handle(request);
    }

    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    if (!token) {
      this.router.navigate(['/login']);
      return throwError(() => new Error('No token found'));
    }

    // Clone the request and add headers
    request = request.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': environment.production ? 'https://kuis.canducation.com' : 'http://localhost:4200'
      },
      withCredentials: true
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Detailed error in interceptor:', {
          status: error.status,
          message: error.message,
          headers: error.headers,
          error: error.error
        });
        if (error.status === 401) {
          console.log('Unauthorized, logging out');
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
