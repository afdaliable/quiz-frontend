// src/app/auth/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, of } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private supabaseService: SupabaseService) {}

  canActivate(): Observable<boolean | UrlTree> {
    // First check if we already have a session in memory
    const currentSession = this.supabaseService.currentSession;
    if (currentSession) {
      return of(true);
    }

    // Otherwise, wait for the session$ observable
    return this.supabaseService.session$.pipe(
      take(1),
      map(session => {
        if (session) {
          return true;
        } else {
          console.log('AuthGuard: No session found, redirecting to login');
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}
