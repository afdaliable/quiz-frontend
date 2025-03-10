import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

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
    private supabaseService: SupabaseService,
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
    
    // Check for error parameter (user might have canceled the auth)
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        console.log('Auth error detected:', params['error']);
        this.errorMessage = 'Authentication was canceled or failed. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        return;
      }
    });
    
    // First check for hash fragment (implicit flow)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('Detected hash fragment, letting Supabase handle it automatically');
      // Supabase will automatically handle this case
      // Just wait a moment and then redirect
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1500);
      return;
    }
    
    // Then check for code parameter (PKCE flow)
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      if (code && !this.processingCallback) {
        this.processingCallback = true;
        console.log('Detected code parameter, handling callback');
        this.handleAuthCallback(code);
      } else if (!code) {
        console.log('No code parameter found');
        this.errorMessage = 'No authentication code found. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    });
  }

  private async handleAuthCallback(code: string): Promise<void> {
    try {
      console.log('Processing authentication callback...');
      const { data, error } = await this.supabaseService.handleAuthCallback(code);
      
      if (error) {
        console.error('Error in callback:', error);
        this.errorMessage = 'Authentication failed. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login'], { 
            queryParams: { error: this.errorMessage } 
          });
        }, 2000);
        return;
      }
      
      if (data?.session) {
        console.log('Authentication successful, redirecting to home');
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1000);
      } else {
        console.warn('No session returned from callback');
        this.errorMessage = 'Authentication completed but no session was created. Please try again.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    } catch (error) {
      console.error('Unexpected error in callback handler:', error);
      this.errorMessage = 'An unexpected error occurred. Please try again.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }
} 