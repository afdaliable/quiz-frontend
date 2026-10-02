import { Component, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { PremiumService, QrisPayment } from '../services/premium.service';
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

const PLAN_TAGLINES: Record<string, string> = {
  silver:   'Cocok untuk pemula yang baru mulai belajar',
  gold:     'Pilihan terpopuler untuk hasil optimal',
  platinum: 'Untuk belajar intensif tanpa batas',
  ultimate: 'Akses penuh seumur hidup, bayar sekali',
};

@Component({
  selector: 'app-premium-plans',
  templateUrl: './premium-plans.component.html',
  styleUrls: ['./premium-plans.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PremiumPlansComponent implements OnInit, OnDestroy {

  @HostBinding('class') hostClasses = 'block bg-white dark:bg-gray-900';
  plans: any[] = [];
  activeSubscription: any = null;
  loading = true;
  error = '';
  isDarkMode = false;
  loadingSubscription = false;
  processingPayment = false;

  // Tagihan QRIS yang sedang ditampilkan. Pelunasan dideteksi webhook di
  // backend; halaman ini cukup menanyakan statusnya berkala.
  qris: QrisPayment | null = null;
  qrisStatus: 'PENDING' | 'PAID' | 'EXPIRED' = 'PENDING';
  sisaDetik = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly paymentMethods = [
    { icon: '📱', name: 'QRIS' },
    { icon: '🏦', name: 'Transfer Bank' },
    { icon: '💳', name: 'Kartu Kredit/Debit' },
    { icon: '🛍️', name: 'GoPay' },
    { icon: '💜', name: 'OVO' },
    { icon: '🔵', name: 'Dana' },
  ];

  readonly faqItems = [
    {
      q: 'Kapan akses premium aktif setelah pembayaran?',
      a: 'Langsung aktif otomatis setelah pembayaran terverifikasi oleh sistem. Biasanya dalam hitungan detik hingga menit.',
    },
    {
      q: 'Apakah bisa cancel langganan?',
      a: 'Paket premium berbasis durasi (bukan berlangganan bulanan berulang), sehingga tidak perlu cancel. Akses aktif hingga masa berlaku habis.',
    },
    {
      q: 'Apa yang terjadi setelah masa langganan habis?',
      a: 'Akun kembali ke mode gratis secara otomatis. Semua progress dan riwayat kuis tetap tersimpan.',
    },
    {
      q: 'Apakah ada refund jika terjadi masalah?',
      a: 'Hubungi support kami dalam 24 jam setelah pembayaran jika terjadi masalah teknis. Kami akan membantu dengan cepat.',
    },
    {
      q: 'Bagaimana cara aktivasi setelah bayar?',
      a: 'Tidak perlu aktivasi manual. Sistem akan otomatis memperbarui akses kamu setelah pembayaran terkonfirmasi. Coba refresh halaman jika belum aktif.',
    },
  ];

  openFaqIndex: number | null = null;

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

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

    this.premiumService.createQrisPayment(planId).pipe(
      finalize(() => (this.processingPayment = false))
    ).subscribe({
      next: (tagihan) => {
        this.qris = tagihan;
        this.qrisStatus = 'PENDING';
        this.mulaiHitungMundur(tagihan.expired_at);
        this.mulaiPolling(tagihan.order_id);
      },
      error: (error) => {
        if (error.message?.includes('Authentication failed')) {
          this.error = 'Sesi berakhir. Silakan login kembali.';
          setTimeout(() => {
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/premium-plans' } });
          }, 3000);
        } else {
          this.error = error.message || 'Gagal membuat tagihan QRIS. Silakan coba lagi.';
        }
      }
    });
  }

  /** expired_at dari KlikQRIS berupa "YYYY-MM-DD HH:mm:ss" waktu WIB tanpa zona. */
  private mulaiHitungMundur(expiredAt: string | null): void {
    this.hentiHitungMundur();
    const batas = expiredAt ? new Date(expiredAt.replace(' ', 'T') + '+07:00').getTime() : NaN;
    const hitung = () => {
      this.sisaDetik = Number.isNaN(batas) ? 0 : Math.max(0, Math.floor((batas - Date.now()) / 1000));
      if (this.sisaDetik === 0 && !Number.isNaN(batas) && this.qrisStatus === 'PENDING') {
        this.qrisStatus = 'EXPIRED';
        this.hentiPolling();
      }
    };
    hitung();
    this.countdownTimer = setInterval(hitung, 1000);
  }

  private mulaiPolling(orderId: string): void {
    this.hentiPolling();
    this.pollTimer = setInterval(() => {
      this.premiumService.getQrisStatus(orderId).subscribe({
        next: (st) => {
          if (st.status === 'PAID') {
            this.qrisStatus = 'PAID';
            this.hentiPolling();
            this.hentiHitungMundur();
            this.checkActiveSubscription();   // akses premium langsung terlihat
          } else if (st.status === 'EXPIRED') {
            this.qrisStatus = 'EXPIRED';
            this.hentiPolling();
            this.hentiHitungMundur();
          }
        },
        error: () => { /* coba lagi di putaran berikutnya */ }
      });
    }, 4000);
  }

  get sisaWaktu(): string {
    const m = Math.floor(this.sisaDetik / 60);
    const d = this.sisaDetik % 60;
    return `${m}:${d.toString().padStart(2, '0')}`;
  }

  tutupQris(): void {
    this.hentiPolling();
    this.hentiHitungMundur();
    this.qris = null;
  }

  private hentiPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private hentiHitungMundur(): void {
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  ngOnDestroy(): void {
    this.hentiPolling();
    this.hentiHitungMundur();
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

  getPlanTagline(planName: string): string {
    return PLAN_TAGLINES[planName?.toLowerCase()] ?? '';
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
