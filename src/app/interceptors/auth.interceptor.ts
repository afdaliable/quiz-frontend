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
import { catchError, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private supabaseService: SupabaseService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip Supabase requests
    if (request.url.includes(environment.supabaseUrl)) {
      return next.handle(request);
    }

    // Skip token check for login and signup endpoints
    if (request.url.includes('/auth/v1/token') || 
        request.url.includes('/signup') || 
        request.method === 'OPTIONS') {
      return next.handle(request);
    }

    return this.supabaseService.session$.pipe(
      take(1),
      switchMap(session => {
        if (!session) {
          console.log('No session found, redirecting to login');
          this.router.navigate(['/login']);
          return throwError(() => new Error('No session found'));
        }

        // Clone the request with auth token
        request = request.clone({
          setHeaders: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          withCredentials: true
        });

        return next.handle(request).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 0) {
              console.error('CORS or Network error:', error);
              return throwError(() => new Error('Network error occurred'));
            }
            if (error.status === 401) {
              this.supabaseService.signOut();
              this.router.navigate(['/login']);
            }
            return throwError(() => error);
          })
        );
      })
    );
  }
}
