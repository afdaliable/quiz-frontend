import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from './services/user.service';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, filter, Subscription } from 'rxjs';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  user$!: Observable<any>;
  title = 'quiz-frontend';
  private currentUrl: string = '';
  private isRedirecting = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private userService: UserService,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.user$ = this.userService.user$;

    // Track current URL to prevent redirection loops
    const routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.url;
      this.isRedirecting = false; // Reset redirection flag after navigation completes
      console.log('Navigation completed to:', this.currentUrl);
    });
    this.subscriptions.push(routerSub);

    // Handle auth redirect (for OAuth authentication)
    const isAuthCallback = 
      window.location.hash && window.location.hash.includes('access_token') || 
      window.location.pathname.includes('/auth/callback');
    
    if (isAuthCallback) {
      console.log('Detected auth callback');
      // Don't do any redirects here, let the callback component handle it
      return;
    }

    // Listen for auth state changes
    const authSub = this.supabaseService.session$.subscribe(session => {
      console.log('Auth state changed:', session ? 'Logged in' : 'Logged out');
      
      // Skip redirection if we're on an auth callback page
      if (this.currentUrl.includes('/auth/callback')) {
        console.log('On auth callback page, skipping redirection');
        return;
      }
      
      // Prevent redirection loops
      if (this.isRedirecting) {
        console.log('Already redirecting, skipping');
        return;
      }
      
      // Get authentication status
      const isAuthenticated = this.supabaseService.isAuthenticated;
      console.log('Authentication status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      
      // Only redirect if we're not already on the target page
      if (isAuthenticated) {
        // If logged in and on login/register page, go to home
        if (this.currentUrl === '/login' || this.currentUrl === '/register' || this.currentUrl === '/verification') {
          console.log('Logged in on auth page, redirecting to home');
          this.isRedirecting = true;
          this.router.navigate(['/home']);
        }
      } else {
        // If not logged in and not on login/register/verification page, go to login
        const isPublicPage = 
          this.currentUrl === '/login' || 
          this.currentUrl === '/register' || 
          this.currentUrl === '/verification' ||
          this.currentUrl.includes('/auth/callback');
        
        if (!isPublicPage) {
          console.log('Not logged in on protected page, redirecting to login');
          this.isRedirecting = true;
          this.router.navigate(['/login']);
        }
      }
    });
    this.subscriptions.push(authSub);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  logout() {
    this.supabaseService.signOut();
  }
}
