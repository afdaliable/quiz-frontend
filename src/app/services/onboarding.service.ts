import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OnboardingData {
  goals: string[];
  timeframe: string;
  examDate: string | null;
  onboardingCompleted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private readonly STORAGE_KEY = 'onboarding_data';
  private readonly COMPLETED_KEY = 'onboarding_completed';
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getApiUrl(endpoint: string): string {
    if (environment.production) {
      const base = window.location.origin;
      return `${base}/api/${endpoint.replace(/^\//, '')}`;
    }
    return `/api/${endpoint.replace(/^\//, '')}`;
  }

  isCompleted(): boolean {
    if (localStorage.getItem(this.COMPLETED_KEY) === 'true') return true;
    const local = this.getLocal();
    return local?.onboardingCompleted === true;
  }

  saveToLocal(data: Partial<OnboardingData>): void {
    const existing = this.getLocal() ?? { goals: [], timeframe: '', examDate: null, onboardingCompleted: false };
    const merged = { ...existing, ...data };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    if (merged.onboardingCompleted) {
      localStorage.setItem(this.COMPLETED_KEY, 'true');
    }
  }

  getLocal(): OnboardingData | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OnboardingData;
    } catch {
      return null;
    }
  }

  syncToBackend(data: OnboardingData): Observable<any> {
    const url = this.getApiUrl('user/onboarding');
    const body = {
      goals: data.goals,
      timeframe: data.timeframe,
      exam_date: data.examDate ?? null,
      onboarding_completed: data.onboardingCompleted
    };
    return this.http.patch(url, body).pipe(
      catchError(() => of(null))
    );
  }

  markComplete(): void {
    const local = this.getLocal() ?? { goals: [], timeframe: '', examDate: null, onboardingCompleted: false };
    local.onboardingCompleted = true;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(local));
    localStorage.setItem(this.COMPLETED_KEY, 'true');

    // Update stored user object so guard reads fresh value
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        user.onboarding_completed = true;
        localStorage.setItem('user', JSON.stringify(user));
      } catch {}
    }
  }

  clearLocal(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
