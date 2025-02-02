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

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    
    let headers = request.headers
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    if (token && !request.url.includes('/signup') && !request.url.includes('/auth/v1/token')) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const clonedRequest = request.clone({
      headers: headers
    });

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
