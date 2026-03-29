import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScoreHistoryResponse, ScoreHistoryQuery } from '../models/score-history.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getScoreHistory(params: ScoreHistoryQuery = {}): Observable<ScoreHistoryResponse> {
    let httpParams = new HttpParams();
    if (params.days !== undefined) httpParams = httpParams.set('days', params.days.toString());
    if (params.package_id)        httpParams = httpParams.set('package_id', params.package_id.toString());
    if (params.category)          httpParams = httpParams.set('category', params.category);

    return this.http.get<ScoreHistoryResponse>(
      `${this.baseUrl}/analytics/score-history`,
      { params: httpParams }
    );
  }
}
