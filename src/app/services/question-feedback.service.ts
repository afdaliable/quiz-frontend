import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type RatingKind = 'helpful' | 'confusing';

export interface RatingSummary {
  helpful_count:   number;
  confusing_count: number;
  user_rating:     RatingKind | null;
}

export type ReportReason =
  | 'wrong_answer'
  | 'unclear_explanation'
  | 'not_relevant'
  | 'duplicate'
  | 'other';

export interface SubmitReportRequest {
  reason: ReportReason;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class QuestionFeedbackService {

  constructor(private http: HttpClient) {}

  private getUrl(path: string): string {
    return environment.production
      ? `${environment.apiUrl}/${path}`
      : `/api/${path}`;
  }

  private getOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }),
      withCredentials: true
    };
  }

  getRatings(questionId: number): Observable<RatingSummary | null> {
    return this.http
      .get<RatingSummary>(this.getUrl(`questions/${questionId}/ratings`), this.getOptions())
      .pipe(catchError(() => of(null)));
  }

  /** rating=null → cabut vote */
  submitRating(questionId: number, rating: RatingKind | null): Observable<RatingSummary | null> {
    return this.http
      .post<RatingSummary>(
        this.getUrl(`questions/${questionId}/rate`),
        rating ? { rating } : null,
        this.getOptions()
      )
      .pipe(catchError(() => of(null)));
  }

  submitReport(questionId: number, req: SubmitReportRequest): Observable<any> {
    return this.http
      .post(this.getUrl(`questions/${questionId}/report`), req, this.getOptions())
      .pipe(catchError(() => of(null)));
  }
}
