import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { UserService } from '../services/user.service';
import { SupabaseService } from '../services/supabase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  currentUser: any;
  isAuthenticated: boolean = false;
  private sessionSubscription: Subscription | null = null;

  constructor(
    private themeService: ThemeService,
    private userService: UserService,
    public router: Router,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if already logged in
    const session = this.supabaseService.currentSession;
    this.isAuthenticated = !!session;
    if (session) {
      this.currentUser = session.user.user_metadata;
    }
    
    // Subscribe to session changes
    this.sessionSubscription = this.supabaseService.session$.subscribe(session => {
      this.isAuthenticated = !!session;
      if (session) {
        this.currentUser = session.user.user_metadata;
      } else {
        this.currentUser = null;
      }
    });
    
    // Also subscribe to user service for backward compatibility
    this.userService.user$.subscribe(user => {
      if (user && !this.currentUser) {
        this.currentUser = user;
      }
    });
  }
  
  ngOnDestroy(): void {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.supabaseService.signOut().then(() => {
      this.router.navigate(['/login']);
    });
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getUserName(): string {
    if (this.currentUser) {
      return this.currentUser.display_name || 
             this.currentUser.name || 
             this.currentUser.email || 
             'User';
    }
    return 'Guest';
  }

  getButtonText(): string {
    const currentRoute = this.router.url;
    if (currentRoute === '/login') {
      return 'Register';
    } else if (currentRoute === '/register') {
      return 'Login';
    } else if (this.isLoggedIn()) {
      return 'Logout';
    }
    return 'Login';
  }

  getButtonRoute(): string {
    const currentRoute = this.router.url;
    if (currentRoute === '/login') {
      return '/register';
    } else if (currentRoute === '/register') {
      return '/login';
    }
    return '/login';
  }
}
