import { Component, OnInit, HostBinding } from '@angular/core';
import { PremiumService } from '../services/premium.service';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

const FEATURE_TRANSLATIONS: Array<[string, string]> = [
  ['access to all premium',        'Akses semua paket soal premium'],
  ['access to basic premium',      'Akses paket soal premium (dasar)'],
  ['access to basic',              'Akses paket soal (dasar)'],
  ['access to premium',            'Akses paket soal premium'],
  ['priority support',             'Dukungan prioritas'],
  ['ad-free',                      'Tanpa iklan'],
  ['detailed performance',         'Analitik performa lengkap'],
  ['downloadable',                 'Laporan kuis bisa diunduh'],
  ['personalized learning',        'Jalur belajar personal'],
  ['expert consultation',          'Konsultasi dengan pengajar'],
  ['early access',                 'Akses awal fitur baru'],
  ['performance analytics',        'Analitik performa lengkap'],
  ['quiz reports',                 'Laporan kuis bisa diunduh'],
];

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  silver:   { label: 'Mulai dari sini',  color: 'bg-gray-500 text-white' },
  gold:     { label: '⭐ Paling Populer', color: 'bg-amber-500 text-white' },
  platinum: { label: '🔥 Best Value',     color: 'bg-indigo-600 text-white' },
  ultimate: { label: '♾️ Seumur Hidup',   color: 'bg-purple-600 text-white' },
};

@Component({
  selector: 'app-premium-plans',
  templateUrl: './premium-plans.component.html',
  styleUrls: ['./premium-plans.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PremiumPlansComponent implements OnInit {

  @HostBinding('class') hostClasses = 'block bg-white dark:bg-gray-900';
  plans: any[] = [];
  activeSubscription: any = null;
  loading = true;
  error = '';
  isDarkMode = false;
  loadingSubscription = false;
  processingPayment = false;

  readonly paymentMethods = [
    { icon: '📱', name: 'QRIS' },
    { icon: '🏦', name: 'Transfer Bank' },
    { icon: '💳', name: 'Kartu Kredit/Debit' },
    { icon: '🛍️', name: 'GoPay' },
    { icon: '💜', name: 'OVO' },
    { icon: '🔵', name: 'Dana' },
  ];

  constructor(
    private premiumService: PremiumService,
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
    this.loadPlans();
    this.checkActiveSubscription();
  }

  loadPlans(): void {
    this.loading = true;
    this.error = '';

    this.premiumService.getPremiumPlans().pipe(
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: (plans) => {
        this.plans = plans;
      },
      error: () => {
        this.error = 'Gagal memuat paket premium. Silakan coba lagi.';
      }
    });
  }

  checkActiveSubscription(): void {
    this.loadingSubscription = true;

    this.premiumService.getActiveSubscription().pipe(
      finalize(() => { this.loadingSubscription = false; })
    ).subscribe({
      next: (subscription) => { this.activeSubscription = subscription; },
      error: () => { /* silent */ }
    });
  }

  subscribeToPlan(planId: number): void {
    if (this.processingPayment) return;

    this.processingPayment = true;
    this.error = '';

    this.premiumService.generatePaymentLink(planId).subscribe({
      next: (response) => {
        if (response.payment_link) {
          localStorage.setItem('selected_plan_id', planId.toString());
          window.location.href = response.payment_link;
        } else {
          this.processingPayment = false;
          this.error = 'Link pembayaran tidak valid. Silakan coba lagi.';
        }
      },
      error: (error) => {
        this.processingPayment = false;
        if (error.status === 401 || error.message?.includes('Authentication failed')) {
          this.error = 'Sesi berakhir. Silakan login kembali.';
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: '/premium-plans' }
            });
          }, 3000);
        } else {
          this.error = 'Gagal membuat link pembayaran. Silakan coba lagi.';
        }
      }
    });
  }

  hasAccess(planId: number): boolean {
    if (!this.activeSubscription) return false;
    return this.activeSubscription.plan_id >= planId;
  }

  retryLoading(): void {
    this.loadPlans();
    this.checkActiveSubscription();
  }

  translateFeature(feature: string): string {
    const lower = feature.toLowerCase();
    const match = FEATURE_TRANSLATIONS.find(([key]) => lower.includes(key));
    return match ? match[1] : feature;
  }

  getPlanBadge(planName: string): { label: string; color: string } | null {
    return PLAN_BADGES[planName?.toLowerCase()] ?? null;
  }

  isPopularPlan(planName: string): boolean {
    return planName?.toLowerCase() === 'gold';
  }

  getPricePerDay(plan: any): string {
    if (plan.is_lifetime) return 'Akses seumur hidup';
    if (!plan.duration_days || plan.duration_days <= 0) return '';
    const perDay = Math.round(plan.price / plan.duration_days);
    return `≈ Rp ${perDay.toLocaleString('id-ID')}/hari`;
  }

  formatPrice(price: number): string {
    return price.toLocaleString('id-ID');
  }
}
