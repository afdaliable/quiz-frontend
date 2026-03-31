import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { BookMarkService } from '../services/bookmark.service';
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
  isPremium: boolean = false;
  bookmarkCount: number = 0;
  userLevelIcon: string = '';
  userLevelNum: number = 0;
  userLevelName: string = '';
  private userSubscription: Subscription | null = null;
  private bookmarkSubscription: Subscription | null = null;

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
    private authService: AuthService,
    private bookMarkService: BookMarkService
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

    const token = this.authService.getToken();
    this.isAuthenticated = !!token;

    this.userSubscription = this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.currentUser = user;
      if (user && user.account_status) {
        this.updatePremiumStatus(user.account_status);
      }
    });

    this.bookmarkSubscription = this.bookMarkService.getBookmarkCount().subscribe(
      count => this.bookmarkCount = count
    );

    if (this.isAuthenticated) {
      this.userService.getUserXpSummary().subscribe({
        next: (xp) => {
          this.userLevelIcon = xp.level_icon;
          this.userLevelNum = xp.current_level;
          this.userLevelName = xp.level_name;
        },
        error: () => {}
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) this.userSubscription.unsubscribe();
    if (this.bookmarkSubscription) this.bookmarkSubscription.unsubscribe();
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

  updatePremiumStatus(accountStatus: string): void {
    this.isPremium = accountStatus === 'Premium';
  }

  getButtonRoute(): string {
    const currentRoute = this.router.url;
    if (currentRoute === '/login') {
      return '/home';
    }
    return '/login';
  }
}
