import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { ThemeService } from '../services/theme.service';
import {
  PublicProfileService,
  PublicProfileResponse,
  BadgeInfo,
  CategoryBestScore,
} from '../services/public-profile.service';

@Component({
  selector: 'app-public-profile',
  templateUrl: './public-profile.component.html',
  styleUrls: ['./public-profile.component.css']
})
export class PublicProfileComponent implements OnInit {
  @ViewChild('profileCard') profileCard!: ElementRef;

  isDarkMode = false;
  isLoading = true;
  isNotFound = false;
  isPrivate = false;
  showShare = false;
  copySuccess = false;

  profile: PublicProfileResponse | null = null;
  username = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private profileService: PublicProfileService,
    private themeService: ThemeService,
    private titleService: Title,
    private metaService: Meta,
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(d => this.isDarkMode = d);
    this.username = this.route.snapshot.paramMap.get('username') || '';
    if (!this.username) { this.router.navigate(['/']); return; }
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.profileService.getPublicProfile(this.username).subscribe({
      next: (data) => {
        this.profile = data;
        this.updateMeta(data);
        this.isLoading = false;
      },
      error: (err) => {
        if (err.status === 404) {
          const body = err.error;
          if (body?.message && body.message.includes('privat')) {
            this.isPrivate = true;
          } else {
            this.isNotFound = true;
          }
        } else {
          this.isNotFound = true;
        }
        this.isLoading = false;
      }
    });
  }

  private updateMeta(p: PublicProfileResponse): void {
    const desc = this.buildMetaDescription(p);
    this.titleService.setTitle(`${p.display_name} di QuizKu`);
    this.metaService.updateTag({ property: 'og:title', content: `${p.display_name} di QuizKu` });
    this.metaService.updateTag({ property: 'og:description', content: desc });
    this.metaService.updateTag({ property: 'og:url', content: window.location.href });
    this.metaService.updateTag({ name: 'description', content: desc });
  }

  private buildMetaDescription(p: PublicProfileResponse): string {
    const parts: string[] = [];
    if (p.stats) {
      if (p.stats.total_quizzes > 0) parts.push(`${p.stats.total_quizzes} kuis selesai`);
      if (p.stats.avg_score > 0) parts.push(`Rata-rata ${p.stats.avg_score.toFixed(0)}`);
      if (p.stats.learning_streak_days > 0) parts.push(`Streak ${p.stats.learning_streak_days} hari`);
    }
    return (parts.join(' · ') || 'Profil belajar') + ' — Lihat pencapaian di QuizKu!';
  }

  getProfileUrl(): string {
    return `https://kuis.canducation.com/u/${this.username}`;
  }

  getWhatsAppUrl(): string {
    const text = encodeURIComponent(
      `Lihat profil belajar saya di QuizKu! ${this.getProfileUrl()}`
    );
    return `https://wa.me/?text=${text}`;
  }

  getTwitterUrl(): string {
    const text = encodeURIComponent(
      `Lihat pencapaian belajar saya di QuizKu! ${this.getProfileUrl()}`
    );
    return `https://twitter.com/intent/tweet?text=${text}`;
  }

  async copyLink(): Promise<void> {
    await navigator.clipboard.writeText(this.getProfileUrl());
    this.copySuccess = true;
    setTimeout(() => this.copySuccess = false, 2000);
  }

  async downloadCard(): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(this.profileCard.nativeElement, {
      scale: 2,
      backgroundColor: this.isDarkMode ? '#111827' : '#F5F3FF',
    });
    const link = document.createElement('a');
    link.download = `quizku-profil-${this.username}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  getEarnedBadges(): BadgeInfo[] { return this.profile?.badges?.filter(b => b.earned) ?? []; }
  getLockedBadges(): BadgeInfo[] { return this.profile?.badges?.filter(b => !b.earned) ?? []; }

  formatJoinDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  }

  groupByCategory(scores: CategoryBestScore[]): { category: string; items: CategoryBestScore[] }[] {
    const map = new Map<string, CategoryBestScore[]>();
    for (const s of scores) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }
}
