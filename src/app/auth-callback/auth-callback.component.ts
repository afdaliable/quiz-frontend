import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="min-h-screen flex items-center justify-center p-4" [ngClass]="{'bg-gray-900': isDarkMode, 'bg-gray-50': !isDarkMode}">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" [ngClass]="{'border-white': isDarkMode, 'border-indigo-600': !isDarkMode}"></div>
        <h2 class="text-xl font-semibold" [ngClass]="{'text-white': isDarkMode, 'text-gray-900': !isDarkMode}">
          Completing authentication...
        </h2>
        <p class="mt-2" [ngClass]="{'text-gray-300': isDarkMode, 'text-gray-600': !isDarkMode}">
          Please wait while we log you in.
        </p>
        <div *ngIf="errorMessage" class="mt-4 p-3 rounded-md text-sm" [ngClass]="{'bg-red-900/50 text-red-200': isDarkMode, 'bg-red-50 text-red-700': !isDarkMode}">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  isDarkMode = false;
  errorMessage = '';
  private processingCallback = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if we're already processing a callback to prevent duplicate processing
    if (this.processingCallback) {
      console.log('Already processing callback, skipping');
      return;
    }
    
    // Check for error parameter
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        console.log('Auth error detected:', params['error']);
        this.errorMessage = 'Authentication was canceled or failed. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        return;
      }
      
      // Get the authorization code from the URL
      const code = params['code'];
      const state = params['state'];
      
      if (code && state) {
        this.processingCallback = true;
        
        // Verify the state parameter to prevent CSRF attacks
        const storedState = localStorage.getItem('googleOAuthState');
        
        if (state !== storedState) {
          console.error('State mismatch, possible CSRF attack');
          this.errorMessage = 'Security verification failed. Please try again.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
          return;
        }
        
        // Clear the stored state
        localStorage.removeItem('googleOAuthState');
        
        // Handle the authorization code
        this.handleAuthCode(code);
      } else {
        // No code - redirect to login
        console.log('No authorization code found');
        this.errorMessage = 'No authentication code found. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    });
  }

  private handleAuthCode(code: string): void {
    // Exchange the code for tokens with the backend
    this.authService.exchangeCodeForToken(code).subscribe({
      next: () => {
        console.log('Authentication successful');
        
        // Check if we have a stored return URL
        const returnUrl = localStorage.getItem('authReturnUrl');
        const hasPendingPayment = localStorage.getItem('hasPendingPayment');
        
        // Clear stored return URL and pending payment flag
        localStorage.removeItem('authReturnUrl');
        localStorage.removeItem('hasPendingPayment');
        
        if (returnUrl && returnUrl.includes('/payment/callback')) {
          console.log('Redirecting to payment callback:', returnUrl);
          setTimeout(() => {
            this.router.navigate([returnUrl]);
          }, 1000);
        } else if (returnUrl) {
          console.log('Redirecting to stored return URL:', returnUrl);
          setTimeout(() => {
            this.router.navigate([returnUrl]);
          }, 1000);
        } else {
          console.log('No stored return URL, redirecting to home');
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1000);
        }
      },
      error: (error) => {
        console.error('Error exchanging code for token:', error);
        this.errorMessage = 'Authentication failed. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login'], { 
            queryParams: { error: this.errorMessage } 
          });
        }, 2000);
      }
    });
  }
} 