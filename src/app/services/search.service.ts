import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SoalSearchResult {
  id: number;
  soal: string;
  question_type: string;
  modul: string | null;
  pelajaran: string | null;
  tag: string | null;
  nama_paket_soal: string | null;
  kategori_soal: string | null;
}

export interface SoalSearchResponse {
  results: SoalSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchFilters {
  modul: string[];
  pelajaran: string[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private http: HttpClient) {}

  private getUrl(path: string): string {
    return environment.production
      ? `${environment.apiUrl}/${path}`
      : `/api/${path}`;
  }

  search(
    q: string,
    modul?: string,
    pelajaran?: string,
    page = 1,
    limit = 20
  ): Observable<SoalSearchResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (q && q.trim()) {
      params = params.set('q', q.trim());
    }
    if (modul && modul.trim()) {
      params = params.set('modul', modul.trim());
    }
    if (pelajaran && pelajaran.trim()) {
      params = params.set('pelajaran', pelajaran.trim());
    }

    return this.http
      .get<SoalSearchResponse>(this.getUrl('soal/search'), { params })
      .pipe(catchError(() => of({ results: [], total: 0, page, limit })));
  }

  getFilters(): Observable<SearchFilters> {
    return this.http
      .get<SearchFilters>(this.getUrl('soal/search/filters'))
      .pipe(catchError(() => of({ modul: [], pelajaran: [] })));
  }
}
