import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PublicStats {
  total_quizzes: number;
  avg_score: number;
  best_score: number;
  learning_streak_days: number;
  favorite_category: string | null;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface CategoryBestScore {
  category: string;
  best_score: number;
  total_attempts: number;
}

export interface PublicProfileResponse {
  username: string;
  display_name: string;
  picture_url: string | null;
  joined_at: string;
  stats: PublicStats | null;
  badges: BadgeInfo[] | null;
  best_scores: CategoryBestScore[] | null;
}

export interface UsernameCheckResponse {
  available: boolean;
  message: string;
}

export interface PrivacySettings {
  profile_public?: boolean;
  show_stats?: boolean;
  show_badges?: boolean;
  show_best_scores?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicProfileService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject('BASE_API_URL') baseApiUrl: string,
  ) {
    this.baseUrl = baseApiUrl;
  }

  getPublicProfile(username: string): Observable<PublicProfileResponse> {
    return this.http.get<PublicProfileResponse>(
      `${this.baseUrl}/users/profile/${username}`
    );
  }

  checkUsername(username: string): Observable<UsernameCheckResponse> {
    return this.http.get<UsernameCheckResponse>(
      `${this.baseUrl}/users/username/check?username=${encodeURIComponent(username)}`
    );
  }

  setUsername(username: string): Observable<{ message: string; username: string }> {
    return this.http.post<{ message: string; username: string }>(
      `${this.baseUrl}/users/me/username`,
      { username }
    );
  }

  updatePrivacy(settings: PrivacySettings): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/users/me/privacy`,
      settings
    );
  }
}
