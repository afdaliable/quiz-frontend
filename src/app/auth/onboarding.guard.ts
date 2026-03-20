import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OnboardingService } from '../services/onboarding.service';

@Injectable({
  providedIn: 'root'
})
export class OnboardingGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    private onboardingService: OnboardingService
  ) {}

  canActivate(): boolean | UrlTree {
    // If user is not logged in, let AuthGuard handle it
    const token = this.authService.getToken();
    if (!token) return true;

    const user = this.authService.getCurrentUser();

    // Check all sources: backend flag (via stored user), local storage completed flag, local onboarding data
    const isCompleted =
      user?.onboarding_completed === true ||
      this.onboardingService.isCompleted();

    if (!isCompleted) {
      return this.router.createUrlTree(['/onboarding']);
    }

    return true;
  }
}
