import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { PublicProfileService, UsernameCheckResponse } from '../services/public-profile.service';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  username?: string;
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

  // Username editor
  editingUsername = false;
  newUsername = '';
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' = 'idle';
  usernameError = '';
  savingUsername = false;
  private usernameInput$ = new Subject<string>();
  private usernameCheckSub: Subscription | null = null;

  // Privacy settings
  profilePublic = true;
  privacy: Record<string, boolean> = {
    show_stats: true,
    show_badges: true,
    show_best_scores: true,
  };
  privacyOptions = [
    { key: 'show_stats',       label: 'Tampilkan statistik belajar' },
    { key: 'show_badges',      label: 'Tampilkan badge & pencapaian' },
    { key: 'show_best_scores', label: 'Tampilkan skor terbaik per kategori' },
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private themeService: ThemeService,
    private publicProfileService: PublicProfileService,
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

    // Username availability check with debounce
    this.usernameCheckSub = this.usernameInput$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(val => this.publicProfileService.checkUsername(val))
    ).subscribe((res: UsernameCheckResponse) => {
      this.usernameStatus = res.available ? 'available' : 'taken';
      this.usernameError = res.available ? '' : res.message;
    });
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.usernameCheckSub) {
      this.usernameCheckSub.unsubscribe();
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

  onUsernameInput(val: string): void {
    this.newUsername = val;
    if (val.length < 3) { this.usernameStatus = 'idle'; this.usernameError = ''; return; }
    this.usernameStatus = 'checking';
    this.usernameInput$.next(val);
  }

  saveUsername(): void {
    if (this.usernameStatus !== 'available' || this.savingUsername) return;
    this.savingUsername = true;
    this.publicProfileService.setUsername(this.newUsername).subscribe({
      next: (res) => {
        if (this.profile) this.profile.username = res.username;
        this.editingUsername = false;
        this.savingUsername = false;
        this.newUsername = '';
        this.usernameStatus = 'idle';
      },
      error: () => { this.savingUsername = false; }
    });
  }

  savePrivacy(key: string, value: boolean): void {
    const patch: Record<string, boolean> = { [key]: value };
    this.publicProfileService.updatePrivacy(patch).subscribe();
  }

  saveProfileVisibility(isPublic: boolean): void {
    this.publicProfileService.updatePrivacy({ profile_public: isPublic }).subscribe();
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}