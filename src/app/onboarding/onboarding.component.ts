import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { OnboardingService } from '../services/onboarding.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit {
  isDarkMode = false;
  private themeSub: Subscription | null = null;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.darkMode$.subscribe(d => this.isDarkMode = d);
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  skipOnboarding(): void {
    this.onboardingService.markComplete();
    this.router.navigate(['/home']);
  }
}
