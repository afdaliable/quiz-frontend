import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { forkJoin, Subscription } from 'rxjs';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  picture_url: string | null;
  joined_at: string;
  account_status: 'Free' | 'Premium';
  premium_expires_at: string | null;
}

interface UserStats {
  total_quizzes: number;
  avg_score: number;
  favorite_category: string | null;
  learning_streak_days: number;
  total_correct: number;
  total_questions: number;
  total_pomodoro_sessions: number;
  total_pomodoro_minutes: number;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html'
})
export class AccountComponent implements OnInit, OnDestroy {
  loading = false;
  profile: UserProfile | null = null;
  stats: UserStats | null = null;
  errorMessage = '';
  isDarkMode = false;
  private themeSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.themeSubscription = this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );

    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    forkJoin({
      profile: this.userService.getUserProfile(),
      stats: this.userService.getUserStats()
    }).subscribe({
      next: ({ profile, stats }) => {
        this.profile = profile;
        this.stats = stats;
        this.loading = false;

        // Sync account_status dari auth state (sumber yang sama dengan navbar)
        // agar badge tidak stale jika API profile belum ter-update pasca upgrade
        const authUser = this.authService.getCurrentUser();
        if (authUser?.account_status && this.profile) {
          this.profile.account_status = authUser.account_status;
        }
      },
      error: (err) => {
        console.error('Failed to load profile data:', err);
        this.errorMessage = 'Gagal memuat data profil. Silakan coba lagi.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  get accuracyPercent(): number {
    if (!this.stats || this.stats.total_questions === 0) return 0;
    return Math.round((this.stats.total_correct / this.stats.total_questions) * 100);
  }

  formatJoinDate(dateStr: string): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
} 