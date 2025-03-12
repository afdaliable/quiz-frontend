// src/app/auth/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Check if we have a token
    const token = this.authService.getToken();
    if (token) {
      return of(true);
    }

    // Otherwise, wait for the user$ observable
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        if (user) {
          return true;
        } else {
          console.log('AuthGuard: No authenticated user found, redirecting to login');
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
