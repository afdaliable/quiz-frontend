import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../services/theme.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  isDarkMode: boolean = false;
  currentUser: any;

  constructor(
    private themeService: ThemeService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      (isDark: boolean) => this.isDarkMode = isDark
    );
    this.currentUser = this.userService.getUser();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUserName(): string {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.display_name || 'User';
    }
    return 'User';
  }
}
