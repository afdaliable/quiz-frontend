import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ThemeService } from '../services/theme.service';
import { TaxonomyService } from '../services/taxonomy.service';
import { SoalBrowseService, SoalBrowseItem } from '../services/soal-browse.service';
import {
  ActiveTaxonomyFilter,
  TaxonomyTree,
  ExamTrack,
  TaxonomyCategory,
  TaxonomySubcategory
} from '../models/taxonomy.model';
import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

const STORAGE_KEY = 'browse_filter';
const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };
const FORMAT_LABELS: Record<string, string> = { pg: 'Pilihan Ganda', true_false: 'Benar/Salah', fill_blank: 'Isian' };

@Component({
  selector: 'app-browse-soal',
  templateUrl: './browse-soal.component.html',
  styleUrls: ['./browse-soal.component.css']
})
export class BrowseSoalComponent implements OnInit, OnDestroy {
  tree: TaxonomyTree | null = null;
  filter: ActiveTaxonomyFilter = {};
  soalList: SoalBrowseItem[] = [];
  isLoading = false;
  isDarkMode = false;
  isFilterOpen = false;

  // Pagination
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  readonly pageSize = 20;

  // Tag autocomplete
  tagInput = '';
  tagSearch$ = new Subject<string>();
  tagSuggestions: string[] = [];
  isTagLoading = false;

  breadcrumbs: BreadcrumbItem[] = [{ label: 'Browse Soal' }];

  readonly difficulties = ['easy', 'medium', 'hard'] as const;
  readonly formats = ['pg', 'true_false', 'fill_blank'];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
    private taxonomyService: TaxonomyService,
    private soalBrowseService: SoalBrowseService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.darkMode$.subscribe(isDark => (this.isDarkMode = isDark))
    );

    // Tag autocomplete with debounce
    this.subs.push(
      this.tagSearch$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          if (!q || q.length < 2) { this.tagSuggestions = []; return []; }
          this.isTagLoading = true;
          return this.taxonomyService.searchTags(q);
        })
      ).subscribe({
        next: tags => { this.tagSuggestions = tags; this.isTagLoading = false; },
        error: () => { this.tagSuggestions = []; this.isTagLoading = false; }
      })
    );

    // Load tree + read query params simultaneously
    this.subs.push(
      combineLatest([
        this.taxonomyService.getTree(),
        this.route.queryParams
      ]).subscribe({
        next: ([tree, params]) => {
          this.tree = tree;
          // Query params take priority, then localStorage
          if (Object.keys(params).length > 0) {
            this.filter = {
              track_slug: params['track_slug'] || undefined,
              category_slug: params['category_slug'] || undefined,
              subcategory_slug: params['subcategory_slug'] || undefined,
              topic_slug: params['topic_slug'] || undefined,
              difficulty_est: params['difficulty_est'] || undefined,
              format: params['format'] || undefined,
              tags: params['tags'] ? params['tags'].split(',') : undefined
            };
          } else {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              try { this.filter = JSON.parse(saved); } catch { this.filter = {}; }
            }
          }
          this.currentPage = 1;
          this.loadSoal();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Derived selects ──────────────────────────────────────────────────────────

  get availableCategories(): TaxonomyCategory[] {
    if (!this.filter.track_slug || !this.tree) return [];
    const track = this.tree.tracks.find(t => t.slug === this.filter.track_slug);
    return track?.categories ?? [];
  }

  get availableSubcategories(): TaxonomySubcategory[] {
    if (!this.filter.category_slug) return [];
    const cat = this.availableCategories.find(c => c.slug === this.filter.category_slug);
    return cat?.subcategories ?? [];
  }

  get availableTopics() {
    if (!this.filter.subcategory_slug) return [];
    const sub = this.availableSubcategories.find(s => s.slug === this.filter.subcategory_slug);
    return sub?.topics ?? [];
  }

  get hasActiveFilter(): boolean {
    return !!(
      this.filter.track_slug ||
      this.filter.category_slug ||
      this.filter.subcategory_slug ||
      this.filter.topic_slug ||
      this.filter.difficulty_est ||
      this.filter.format ||
      (this.filter.tags && this.filter.tags.length > 0)
    );
  }

  // ── Filter changes ───────────────────────────────────────────────────────────

  onTrackChange(slug: string): void {
    this.filter = { track_slug: slug || undefined };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  onCategoryChange(slug: string): void {
    this.filter = { track_slug: this.filter.track_slug, category_slug: slug || undefined };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  onSubcategoryChange(slug: string): void {
    this.filter = {
      track_slug: this.filter.track_slug,
      category_slug: this.filter.category_slug,
      subcategory_slug: slug || undefined
    };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  onTopicChange(slug: string): void {
    this.filter = {
      ...this.filter,
      topic_slug: slug || undefined
    };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  toggleDifficulty(d: string): void {
    this.filter = {
      ...this.filter,
      difficulty_est: this.filter.difficulty_est === d ? undefined : d as any
    };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  onFormatChange(fmt: string): void {
    this.filter = {
      ...this.filter,
      format: this.filter.format === fmt ? undefined : fmt
    };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  addTag(tag: string): void {
    if (!tag) return;
    const existing = this.filter.tags ?? [];
    if (existing.includes(tag)) return;
    this.filter = { ...this.filter, tags: [...existing, tag] };
    this.tagInput = '';
    this.tagSuggestions = [];
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  removeTag(tag: string): void {
    this.filter = {
      ...this.filter,
      tags: (this.filter.tags ?? []).filter(t => t !== tag)
    };
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  clearFilter(key: keyof ActiveTaxonomyFilter): void {
    const updated = { ...this.filter };
    // Cascade resets
    if (key === 'track_slug') {
      delete updated.track_slug;
      delete updated.category_slug;
      delete updated.subcategory_slug;
      delete updated.topic_slug;
    } else if (key === 'category_slug') {
      delete updated.category_slug;
      delete updated.subcategory_slug;
      delete updated.topic_slug;
    } else if (key === 'subcategory_slug') {
      delete updated.subcategory_slug;
      delete updated.topic_slug;
    } else {
      delete updated[key];
    }
    this.filter = updated;
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  clearAllFilters(): void {
    this.filter = {};
    this.currentPage = 1;
    this.syncToUrl();
    this.loadSoal();
  }

  // ── Sync & Load ──────────────────────────────────────────────────────────────

  syncToUrl(): void {
    const queryParams: Record<string, string> = {};
    if (this.filter.track_slug) queryParams['track_slug'] = this.filter.track_slug;
    if (this.filter.category_slug) queryParams['category_slug'] = this.filter.category_slug;
    if (this.filter.subcategory_slug) queryParams['subcategory_slug'] = this.filter.subcategory_slug;
    if (this.filter.topic_slug) queryParams['topic_slug'] = this.filter.topic_slug;
    if (this.filter.difficulty_est) queryParams['difficulty_est'] = this.filter.difficulty_est;
    if (this.filter.format) queryParams['format'] = this.filter.format;
    if (this.filter.tags?.length) queryParams['tags'] = this.filter.tags.join(',');
    this.router.navigate([], { queryParams, replaceUrl: true });
    this.saveFilterToStorage();
  }

  saveFilterToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.filter));
  }

  loadSoal(): void {
    this.isLoading = true;
    this.soalBrowseService.getSoal(this.filter, this.currentPage, this.pageSize).subscribe({
      next: res => {
        this.soalList = res.questions;
        this.totalItems = res.total;
        this.totalPages = res.total_pages;
        this.isLoading = false;
      },
      error: () => {
        this.soalList = [];
        this.isLoading = false;
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadSoal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  startLatihan(soal: SoalBrowseItem): void {
    this.router.navigate(['/daftar-soal'], {
      queryParams: { soal_id: soal.id }
    });
  }

  // ── Display helpers ──────────────────────────────────────────────────────────

  getDifficultyLabel(d: string): string {
    return DIFFICULTY_LABELS[d] ?? d;
  }

  getDifficultyActiveClass(d: string): string {
    if (d === 'easy') return 'bg-green-100 text-green-700 border-green-300';
    if (d === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  }

  getDifficultyBadgeClass(d: string): string {
    if (d === 'easy') return 'bg-green-100 text-green-700';
    if (d === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  getFormatLabel(fmt: string): string {
    return FORMAT_LABELS[fmt] ?? fmt;
  }

  getTrackName(slug: string): string {
    return this.tree?.tracks.find(t => t.slug === slug)?.name ?? slug;
  }

  getCategoryName(slug: string): string {
    for (const track of (this.tree?.tracks ?? [])) {
      const cat = track.categories.find(c => c.slug === slug);
      if (cat) return cat.name;
    }
    return slug;
  }

  getSubcategoryName(slug: string): string {
    for (const track of (this.tree?.tracks ?? [])) {
      for (const cat of track.categories) {
        const sub = cat.subcategories.find(s => s.slug === slug);
        if (sub) return sub.name;
      }
    }
    return slug;
  }

  getTopicName(slug: string): string {
    for (const track of (this.tree?.tracks ?? [])) {
      for (const cat of track.categories) {
        for (const sub of cat.subcategories) {
          const topic = sub.topics.find(t => t.slug === slug);
          if (topic) return topic.name;
        }
      }
    }
    return slug;
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
