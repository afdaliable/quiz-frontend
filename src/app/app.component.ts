import { Component, OnInit } from '@angular/core';
import { UserService } from './services/user.service';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, filter } from 'rxjs';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  user$!: Observable<any>;
  title = 'quiz-frontend';
  private currentUrl: string = '';
  private isRedirecting = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.user$ = this.userService.user$;

    // Track current URL to prevent redirection loops
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl = event.url;
      this.isRedirecting = false; // Reset redirection flag after navigation completes
      console.log('Navigation completed to:', this.currentUrl);
    });

    // Handle auth redirect (for magic link authentication)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // This is a redirect from Supabase auth
      // The hash will be automatically processed by Supabase
      console.log('Detected auth callback');
    }

    // Listen for auth state changes
    this.supabaseService.session$.subscribe(session => {
      console.log('Auth state changed:', session ? 'Logged in' : 'Logged out');
      
      // Prevent redirection loops
      if (this.isRedirecting) {
        console.log('Already redirecting, skipping');
        return;
      }
      
      // Only redirect if we're not already on the target page
      if (session) {
        // If logged in and on login/register page, go to home
        if (this.currentUrl === '/login' || this.currentUrl === '/register') {
          console.log('Logged in on auth page, redirecting to home');
          this.isRedirecting = true;
          this.router.navigate(['/home']);
        }
      } else {
        // If not logged in and not on login/register/callback page, go to login
        const isAuthPage = this.currentUrl === '/login' || 
                          this.currentUrl === '/register' || 
                          this.currentUrl.includes('/auth/callback');
        
        if (!isAuthPage) {
          console.log('Not logged in on protected page, redirecting to login');
          this.isRedirecting = true;
          this.router.navigate(['/login']);
        }
      }
    });
  }

  logout() {
    this.supabaseService.signOut();
  }
}
