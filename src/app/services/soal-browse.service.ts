import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActiveTaxonomyFilter } from '../models/taxonomy.model';

export interface SoalBrowseItem {
  id: number;
  soal: string;
  question_type: string;
  difficulty_est: string;
  difficulty_calc: string | null;
  format: string;
  track_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  topic_id: string | null;
  /// Additional topic IDs from question_topics M2M (AFD-226)
  topic_ids?: string[];
  tag: string | null;
  modul: string | null;
  pelajaran: string | null;
  status: string;
}

export interface SoalBrowseResponse {
  questions: SoalBrowseItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class SoalBrowseService {
  constructor(private http: HttpClient) {}

  getSoal(filter: ActiveTaxonomyFilter, page = 1, limit = 20): Observable<SoalBrowseResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filter.track_slug) params = params.set('track', filter.track_slug);
    if (filter.category_slug) params = params.set('category', filter.category_slug);
    if (filter.subcategory_slug) params = params.set('subcategory', filter.subcategory_slug);
    if (filter.topic_slug) params = params.set('topic', filter.topic_slug);
    if (filter.difficulty_est) params = params.set('difficulty', filter.difficulty_est);
    if (filter.format) params = params.set('format', filter.format);
    if (filter.tags && filter.tags.length > 0) params = params.set('tags', filter.tags.join(','));

    return this.http.get<SoalBrowseResponse>('/api/admin/soal', { params, withCredentials: true });
  }
}
