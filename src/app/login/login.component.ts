import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  loading = false;
  errorMessage: string = '';
  private userSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check for error query parameter (from auth callback)
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'];
      }
    });
    
    // Subscribe to user changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        // User is logged in, redirect to home
        this.router.navigate(['/home']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  signInWithGoogle(): void {
    this.errorMessage = '';
    this.loading = true;
    
    try {
      // Generate a random state value to prevent CSRF attacks
      const state = this.generateRandomString(32);
      // Store state in localStorage to verify when Google redirects back
      localStorage.setItem('googleOAuthState', state);

      // Google OAuth parameters
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      // OAuth 2.0 parameters
      const params = {
        client_id: environment.googleClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'email profile',
        state: state,
        prompt: 'select_account'
      };

      // Build the authorization URL
      const authUrl = `${googleAuthUrl}?${this.buildQueryString(params)}`;
      
      // Redirect to Google authorization page in the same tab
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      this.errorMessage = error.message || 'Failed to sign in with Google. Please try again.';
      this.loading = false;
    }
  }

  /**
   * Helper method to build query string from parameters
   */
  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Generates a random string for state parameter
   */
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const values = new Uint8Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }
}


