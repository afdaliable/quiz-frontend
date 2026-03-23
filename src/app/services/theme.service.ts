import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { UserService } from './user.service';

const LS_KEY = 'theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(this.getLocalValue());
  darkMode$ = this.darkMode.asObservable();

  // Debounce sync ke backend — 1 request max per detik
  private syncQueue$ = new Subject<boolean>();

  constructor(private userService: UserService) {
    this.applyTheme(this.darkMode.value);

    this.syncQueue$.pipe(debounceTime(1000)).subscribe(isDark => {
      this.syncToBackend(isDark);
    });
  }

  get isDarkMode(): boolean {
    return this.darkMode.value;
  }

  /**
   * Dipanggil dari AppComponent setelah user login.
   * Ambil preferensi dari backend; terapkan jika berbeda dari cache lokal.
   */
  loadFromBackend(): void {
    if (!localStorage.getItem('token')) return;

    this.userService.getUserPreferences().subscribe({
      next: (prefs: any) => {
        if (!prefs) return;
        const backendDark: boolean = prefs?.theme?.dark_mode ?? false;
        if (backendDark !== this.getLocalValue()) {
          this.applyTheme(backendDark);
          localStorage.setItem(LS_KEY, backendDark ? 'dark' : 'light');
        }
      },
      error: () => { /* gagal fetch — tetap pakai localStorage */ }
    });
  }

  /** Dipakai oleh AuthService untuk set tema dari data user saat init. */
  setTheme(isDark: boolean): void {
    this.applyTheme(isDark);
    localStorage.setItem(LS_KEY, isDark ? 'dark' : 'light');
  }

  /** Toggle, simpan ke localStorage, dan queue sync ke backend. */
  toggleTheme(): void {
    const isDark = !this.darkMode.value;
    this.applyTheme(isDark);
    localStorage.setItem(LS_KEY, isDark ? 'dark' : 'light');
    this.syncQueue$.next(isDark);
  }

  private applyTheme(isDark: boolean): void {
    this.darkMode.next(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private getLocalValue(): boolean {
    return localStorage.getItem(LS_KEY) === 'dark';
  }

  private syncToBackend(isDark: boolean): void {
    if (!localStorage.getItem('token')) return;
    this.userService.updatePreferences({ theme: { dark_mode: isDark } })
      .subscribe();
  }
}
