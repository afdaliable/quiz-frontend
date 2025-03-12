import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from './services/user.service';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, filter, Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';

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
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.user$ = this.authService.user$;

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
    const isAuthCallback = window.location.pathname.includes('/auth/callback');
    
    if (isAuthCallback) {
      console.log('Detected auth callback');
      // Don't do any redirects here, let the callback component handle it
      return;
    }

    // Listen for auth state changes
    const authSub = this.authService.user$.subscribe(user => {
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
      
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
      const isAuthenticated = !!this.authService.getToken();
      console.log('Authentication status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
      
      // Only redirect if we're not already on the target page
      if (isAuthenticated) {
        // If logged in and on login page, go to home
        if (this.currentUrl === '/login') {
          console.log('Logged in on auth page, redirecting to home');
          this.isRedirecting = true;
          this.router.navigate(['/home']);
        }
      } else {
        // If not logged in and not on login page, go to login
        const isPublicPage = 
          this.currentUrl === '/login' || 
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
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
