import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { Subscription } from 'rxjs';

interface Profile {
  id: string;
  email: string;
  display_name: string;
  picture?: string;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html'
})
export class AccountComponent implements OnInit, OnDestroy {
  loading = false;
  profile: Profile | null = null;
  errorMessage = '';
  successMessage = '';
  isDarkMode = false;
  private userSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if user is logged in
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to user changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        this.profile = {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          picture: user.picture
        };
      } else {
        this.profile = null;
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
} 