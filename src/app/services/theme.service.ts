import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkMode.asObservable();

  constructor(private userService: UserService) {
    // Check local storage for saved preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.darkMode.next(savedTheme === 'dark');
      this.applyTheme(savedTheme === 'dark');
    }
  }

  setTheme(isDark: boolean): void {
    this.darkMode.next(isDark);
    this.applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  toggleTheme(): void {
    const isDark = !this.darkMode.value;
    this.setTheme(isDark);
    // Sync to backend — fire and forget
    this.userService.updatePreferences({ theme: isDark ? 'dark' : 'light' });
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
