import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../services/theme.service';
import { environment } from '../../environments/environment';

interface PublicStats {
  display_name: string;
  picture_url: string | null;
  joined_at: string;
  total_quizzes: number;
  avg_score: number;
  favorite_category: string | null;
  learning_streak_days: number;
  total_xp: number;
  current_level: number;
  level_name: string;
  level_icon: string;
}

@Component({
  selector: 'app-public-profile',
  templateUrl: './public-profile.component.html'
})
export class PublicProfileComponent implements OnInit {
  isDarkMode = false;
  loading = true;
  errorMessage = '';
  stats: PublicStats | null = null;
  userId: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (this.userId) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    const base = environment.production ? environment.apiUrl : '/api';
    this.http.get<PublicStats>(`${base}/user/${this.userId}/public`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Profil tidak ditemukan.';
        this.loading = false;
      }
    });
  }
}
