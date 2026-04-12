import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { TaxonomyService } from '../services/taxonomy.service';
import {
  TaxonomyTree,
  ExamTrack,
  TaxonomyCategory,
  TaxonomySubcategory,
  ActiveTaxonomyFilter
} from '../models/taxonomy.model';
import { BreadcrumbItem } from '../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-jalur-ujian',
  templateUrl: './jalur-ujian.component.html',
  styleUrls: ['./jalur-ujian.component.css']
})
export class JalurUjianComponent implements OnInit, OnDestroy {
  tree: TaxonomyTree | null = null;
  activeTrack: ExamTrack | null = null;
  activeCategory: TaxonomyCategory | null = null;
  isLoading = true;
  isDarkMode = false;
  expandedSubcategories: Set<number> = new Set();

  breadcrumbs: BreadcrumbItem[] = [];

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
    private taxonomyService: TaxonomyService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.darkMode$.subscribe(isDark => (this.isDarkMode = isDark))
    );

    this.subs.push(
      combineLatest([this.route.params, this.taxonomyService.getTree()]).subscribe({
        next: ([params, tree]) => {
          this.tree = tree;
          this.isLoading = false;

          const trackSlug: string | undefined = params['trackSlug'];
          const categorySlug: string | undefined = params['categorySlug'];

          this.activeTrack = trackSlug
            ? tree.tracks.find(t => t.slug === trackSlug) ?? null
            : null;

          this.activeCategory =
            this.activeTrack && categorySlug
              ? this.activeTrack.categories.find(c => c.slug === categorySlug) ?? null
              : null;

          this.buildBreadcrumbs();
        },
        error: () => {
          this.isLoading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private buildBreadcrumbs(): void {
    this.breadcrumbs = [{ label: 'Jalur Ujian', route: '/jalur-ujian' }];
    if (this.activeTrack) {
      this.breadcrumbs.push({
        label: this.activeTrack.name,
        route: `/jalur-ujian/${this.activeTrack.slug}`
      });
    }
    if (this.activeCategory) {
      this.breadcrumbs.push({ label: this.activeCategory.name });
    }
  }

  selectTrack(track: ExamTrack): void {
    if (track.status !== 'live') return;
    this.router.navigate(['/jalur-ujian', track.slug]);
  }

  selectCategory(trackSlug: string, categorySlug: string): void {
    this.router.navigate(['/jalur-ujian', trackSlug, categorySlug]);
  }

  startBrowse(filter: ActiveTaxonomyFilter): void {
    const queryParams: Record<string, string> = {};
    if (filter.track_slug) queryParams['track_slug'] = filter.track_slug;
    if (filter.category_slug) queryParams['category_slug'] = filter.category_slug;
    if (filter.subcategory_slug) queryParams['subcategory_slug'] = filter.subcategory_slug;
    if (filter.topic_slug) queryParams['topic_slug'] = filter.topic_slug;
    if (filter.difficulty_est) queryParams['difficulty'] = filter.difficulty_est;
    this.router.navigate(['/browse-soal'], { queryParams });
  }

  toggleSubcategory(subcategoryId: number): void {
    if (this.expandedSubcategories.has(subcategoryId)) {
      this.expandedSubcategories.delete(subcategoryId);
    } else {
      this.expandedSubcategories.add(subcategoryId);
    }
  }

  isSubcategoryExpanded(subcategoryId: number): boolean {
    return this.expandedSubcategories.has(subcategoryId);
  }

  get view(): 'tracks' | 'categories' | 'subcategories' {
    if (this.activeCategory) return 'subcategories';
    if (this.activeTrack) return 'categories';
    return 'tracks';
  }

  get liveTracks(): ExamTrack[] {
    return this.tree?.tracks.filter(t => t.status === 'live') ?? [];
  }

  get upcomingTracks(): ExamTrack[] {
    return this.tree?.tracks.filter(t => t.status === 'upcoming') ?? [];
  }

  subcategoryCount(category: TaxonomyCategory): number {
    return category.subcategories?.length ?? 0;
  }
}
