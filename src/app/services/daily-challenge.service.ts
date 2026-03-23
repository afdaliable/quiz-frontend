import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DailyChallengeResponse,
  DailyLeaderboardResponse,
  DailyChallengeStreak,
  UserChallengeStats,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
} from '../models/daily-challenge.model';

@Injectable({ providedIn: 'root' })
export class DailyChallengeService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTodayChallenge(): Observable<DailyChallengeResponse> {
    return this.http.get<DailyChallengeResponse>(`${this.baseUrl}/daily-challenge/today`);
  }

  submitAnswer(req: SubmitChallengeRequest): Observable<SubmitChallengeResponse> {
    return this.http.post<SubmitChallengeResponse>(`${this.baseUrl}/daily-challenge/submit`, req);
  }

  getLeaderboard(): Observable<DailyLeaderboardResponse> {
    return this.http.get<DailyLeaderboardResponse>(`${this.baseUrl}/daily-challenge/leaderboard`);
  }

  getStreak(): Observable<UserChallengeStats> {
    return this.http.get<UserChallengeStats>(`${this.baseUrl}/daily-challenge/stats`);
  }
}
