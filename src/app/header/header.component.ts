import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
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
  showUserMenu: boolean = false;
  private userSubscription: Subscription | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu = false;
    }
  }

  constructor(
    private themeService: ThemeService,
    private userService: UserService,
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if already logged in
    const token = this.authService.getToken();
    this.isAuthenticated = !!token;
    
    // Subscribe to user changes
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUser = user;
    });
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error during logout:', err);
        // Even if there's an error, navigate to login
        this.router.navigate(['/login']);
      }
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
      return 'Home';
    } else if (this.isLoggedIn()) {
      return 'Logout';
    }
    return 'Login';
  }

  getButtonRoute(): string {
    const currentRoute = this.router.url;
    if (currentRoute === '/login') {
      return '/home';
    }
    return '/login';
  }
}
