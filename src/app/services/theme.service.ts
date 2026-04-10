import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { UserService } from './user.service';

const LS_KEY = 'theme';
const LS_EASY_READING_KEY = 'easy-reading';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(this.getLocalValue());
  darkMode$ = this.darkMode.asObservable();

  private easyReading = new BehaviorSubject<boolean>(this.getEasyReadingLocal());
  easyReading$ = this.easyReading.asObservable();

  // Debounce sync ke backend — 1 request max per detik
  private syncQueue$ = new Subject<{ dark_mode: boolean; easy_reading: boolean }>();

  constructor(private userService: UserService) {
    this.applyTheme(this.darkMode.value);
    this.applyEasyReading(this.easyReading.value);

    this.syncQueue$.pipe(debounceTime(1000)).subscribe(theme => {
      this.syncToBackend(theme);
    });
  }

  get isDarkMode(): boolean {
    return this.darkMode.value;
  }

  get isEasyReading(): boolean {
    return this.easyReading.value;
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
        const backendEasyReading: boolean = prefs?.theme?.easy_reading ?? false;

        if (backendDark !== this.getLocalValue()) {
          this.applyTheme(backendDark);
          localStorage.setItem(LS_KEY, backendDark ? 'dark' : 'light');
        }
        if (backendEasyReading !== this.getEasyReadingLocal()) {
          this.applyEasyReading(backendEasyReading);
          localStorage.setItem(LS_EASY_READING_KEY, backendEasyReading ? '1' : '0');
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

  /** Toggle dark mode, simpan ke localStorage, dan queue sync ke backend. */
  toggleTheme(): void {
    const isDark = !this.darkMode.value;
    this.applyTheme(isDark);
    localStorage.setItem(LS_KEY, isDark ? 'dark' : 'light');
    this.queueSync();
  }

  /** Toggle mode baca mudah, simpan ke localStorage, dan queue sync ke backend. */
  toggleEasyReading(): void {
    const val = !this.easyReading.value;
    this.applyEasyReading(val);
    localStorage.setItem(LS_EASY_READING_KEY, val ? '1' : '0');
    this.queueSync();
  }

  private applyTheme(isDark: boolean): void {
    this.darkMode.next(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private applyEasyReading(val: boolean): void {
    this.easyReading.next(val);
    if (val) {
      document.documentElement.classList.add('easy-reading');
    } else {
      document.documentElement.classList.remove('easy-reading');
    }
  }

  private getLocalValue(): boolean {
    return localStorage.getItem(LS_KEY) === 'dark';
  }

  private getEasyReadingLocal(): boolean {
    return localStorage.getItem(LS_EASY_READING_KEY) === '1';
  }

  private queueSync(): void {
    this.syncQueue$.next({
      dark_mode: this.darkMode.value,
      easy_reading: this.easyReading.value,
    });
  }

  private syncToBackend(theme: { dark_mode: boolean; easy_reading: boolean }): void {
    if (!localStorage.getItem('token')) return;
    this.userService.updatePreferences({ theme }).subscribe();
  }
}
