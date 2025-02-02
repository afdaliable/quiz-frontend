// src/app/auth/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      return true;
    } else {
      this.router.navigate(['/auth']);
      return false;
    }
  }
}
