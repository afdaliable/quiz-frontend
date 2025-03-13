// src/app/auth/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, of, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Check if we have a token
    const token = this.authService.getToken();
    if (!token) {
      console.log('AuthGuard: No token found, redirecting to login');
      return of(this.router.createUrlTree(['/login']));
    }

    // Validate the session
    return this.authService.validateSession().pipe(
      take(1),
      switchMap(validationResponse => {
        if (validationResponse.valid) {
          // Session is valid, allow access
          return of(true);
        } else {
          // Session is invalid, redirect to invalid session page
          console.log('AuthGuard: Invalid session, redirecting to invalid session page');
          this.authService.invalidateSession(); // Trigger the session invalid notification
          return of(this.router.createUrlTree(['/invalid-session']));
        }
      }),
      catchError(() => {
        // Error validating session, redirect to invalid session page
        console.log('AuthGuard: Error validating session, redirecting to invalid session page');
        this.authService.invalidateSession(); // Trigger the session invalid notification
        return of(this.router.createUrlTree(['/invalid-session']));
      })
    );
  }
}
