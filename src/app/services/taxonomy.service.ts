import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TaxonomyTree, ExamTrack } from '../models/taxonomy.model';

@Injectable({ providedIn: 'root' })
export class TaxonomyService {
  private treeCache$ = new BehaviorSubject<TaxonomyTree | null>(null);

  constructor(private http: HttpClient) {}

  getTree(): Observable<TaxonomyTree> {
    if (this.treeCache$.value) return of(this.treeCache$.value);
    return this.http.get<TaxonomyTree>('/api/taxonomy/tree', { withCredentials: true })
      .pipe(tap(tree => this.treeCache$.next(tree)));
  }

  getTrackBySlug(slug: string): Observable<ExamTrack | undefined> {
    return this.getTree().pipe(map(t => t.tracks.find(r => r.slug === slug)));
  }

  searchTags(query: string): Observable<string[]> {
    return this.http.get<string[]>(`/api/tags?search=${encodeURIComponent(query)}`, { withCredentials: true });
  }
}
