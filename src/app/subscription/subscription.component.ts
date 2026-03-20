import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { PremiumService, PremiumPlan, UserLicense } from '../services/premium.service';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface FaqItem {
  question: string;
  answer: string;
  open: boolean;
}

const PLAN_RANK: Record<string, number> = {
  silver: 1, gold: 2, platinum: 3, ultimate: 4
};

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css']
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  loading = true;
  error = '';

  plans: PremiumPlan[] = [];
  licenses: UserLicense[] = [];
  activeLicense: UserLicense | null = null;

  showPlanModal = false;
  selectedPlan: PremiumPlan | null = null;
  showCancelModal = false;
  processingPayment = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  private themeSub: Subscription | null = null;
  private toastTimer: any = null;

  readonly paymentMethods = [
    { icon: '📱', name: 'QRIS', detail: null },
    { icon: '🏦', name: 'Transfer Bank', detail: 'BCA, Mandiri, BNI, BRI' },
    { icon: '💳', name: 'Kartu Kredit/Debit', detail: 'Visa, Mastercard' },
    { icon: '💚', name: 'GoPay', detail: null },
    { icon: '💜', name: 'OVO', detail: null },
    { icon: '🔵', name: 'DANA', detail: null },
  ];

  faqItems: FaqItem[] = [
    {
      question: 'Apakah saya bisa membatalkan kapan saja?',
      answer: 'Ya. Membatalkan langganan tidak menghapus akses premium kamu. Akses tetap aktif sampai masa berlangganan berakhir, namun tidak akan diperpanjang otomatis setelah itu.',
      open: false
    },
    {
      question: 'Apa yang terjadi jika langganan saya habis?',
      answer: 'Akses ke paket soal premium akan dinonaktifkan. Kamu tetap bisa menggunakan paket soal gratis. Riwayat kuis dan semua data kamu tetap tersimpan.',
      open: false
    },
    {
      question: 'Bagaimana cara upgrade ke plan lebih tinggi?',
      answer: 'Pilih kartu plan yang ingin kamu upgrade di halaman ini, lalu klik tombol "Upgrade". Konfirmasi pilihan dan selesaikan pembayaran.',
      open: false
    },
    {
      question: 'Apakah ada refund?',
      answer: 'Kami tidak menyediakan refund setelah pembayaran berhasil diproses. Pastikan kamu memilih plan yang tepat sebelum melakukan pembayaran.',
      open: false
    },
    {
      question: 'Bagaimana jika pembayaran gagal?',
      answer: 'Jika pembayaran gagal atau timeout, langganan tidak akan aktif dan tidak ada biaya yang dikenakan. Kamu bisa mencoba kembali dengan memilih plan dan melakukan pembayaran ulang.',
      open: false
    },
  ];

  constructor(
    private premiumService: PremiumService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.themeSub = this.themeService.darkMode$.subscribe(d => this.isDarkMode = d);
    this.loadData();
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private loadData(): void {
    this.loading = true;
    forkJoin({
      plans: this.premiumService.getPremiumPlans().pipe(catchError(() => of([]))),
      licenses: this.premiumService.getUserLicenses().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ plans, licenses }) => {
        this.plans = plans;
        this.licenses = licenses;
        // Find the active license (positive days remaining)
        this.activeLicense = licenses.find(l => l.days_remaining > 0) ?? null;
        this.loading = false;
      },
      error: () => {
        this.error = 'Gagal memuat data langganan. Silakan coba lagi.';
        this.loading = false;
      }
    });
  }

  // Status helpers
  get statusType(): 'free' | 'active' | 'expired' {
    if (!this.activeLicense) {
      // Check if there are any expired licenses
      const hasExpired = this.licenses.some(l => l.days_remaining <= 0 && l.status !== 'active');
      if (hasExpired) return 'expired';
      return 'free';
    }
    return 'active';
  }

  get activePlanName(): string {
    return this.activeLicense?.plan_name ?? '';
  }

  getDaysLeftClass(days: number): string {
    if (days <= 7) return this.isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700';
    if (days <= 30) return this.isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700';
    return this.isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700';
  }

  getDaysLeftDotClass(days: number): string {
    if (days <= 7) return 'bg-red-500';
    if (days <= 30) return 'bg-amber-500';
    return 'bg-green-500';
  }

  // Plan card helpers
  getPlanRank(planName: string): number {
    const key = planName.toLowerCase();
    return PLAN_RANK[key] ?? 0;
  }

  getActivePlanRank(): number {
    if (!this.activeLicense) return 0;
    return this.getPlanRank(this.activeLicense.plan_name);
  }

  isActivePlan(plan: PremiumPlan): boolean {
    if (!this.activeLicense || this.statusType !== 'active') return false;
    const planKey = plan.name.toLowerCase();
    const activePlanKey = this.activeLicense.plan_name.toLowerCase();
    return planKey === activePlanKey || activePlanKey.includes(planKey) || planKey.includes(activePlanKey.split(' ')[0]);
  }

  getPlanButtonLabel(plan: PremiumPlan): string {
    if (this.isActivePlan(plan)) return 'Plan Aktif';
    if (this.statusType === 'free') return 'Mulai Berlangganan';
    const planRank = this.getPlanRank(plan.name);
    const activeRank = this.getActivePlanRank();
    if (planRank > activeRank) return 'Upgrade';
    return 'Pilih Plan Ini';
  }

  getPlanAccentClass(plan: PremiumPlan): string {
    const key = plan.name.toLowerCase();
    const map: Record<string, string> = {
      silver: 'from-gray-400 to-gray-500',
      gold: 'from-amber-400 to-amber-500',
      platinum: 'from-indigo-500 to-indigo-600',
      ultimate: 'from-purple-500 to-purple-600',
    };
    for (const k of Object.keys(map)) {
      if (key.includes(k)) return map[k];
    }
    return 'from-indigo-500 to-indigo-600';
  }

  getPlanBorderClass(plan: PremiumPlan): string {
    if (this.isActivePlan(plan)) {
      return this.isDarkMode ? 'ring-2 ring-amber-500 border-amber-500' : 'ring-2 ring-amber-400 border-amber-400';
    }
    const key = plan.name.toLowerCase();
    if (key.includes('gold')) return this.isDarkMode ? 'border-amber-600/40' : 'border-amber-300';
    if (key.includes('platinum')) return this.isDarkMode ? 'border-indigo-600/40' : 'border-indigo-300';
    if (key.includes('ultimate')) return this.isDarkMode ? 'border-purple-600/40' : 'border-purple-300';
    return this.isDarkMode ? 'border-gray-600' : 'border-gray-200';
  }

  getPlanButtonClass(plan: PremiumPlan): string {
    if (this.isActivePlan(plan)) {
      return this.isDarkMode
        ? 'bg-amber-500/20 text-amber-400 cursor-default'
        : 'bg-amber-50 text-amber-700 cursor-default';
    }
    const key = plan.name.toLowerCase();
    if (key.includes('gold')) return 'bg-amber-500 hover:bg-amber-600 text-white';
    if (key.includes('platinum')) return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    if (key.includes('ultimate')) return 'bg-purple-600 hover:bg-purple-700 text-white';
    return this.isDarkMode
      ? 'bg-gray-600 hover:bg-gray-500 text-white'
      : 'bg-gray-800 hover:bg-gray-700 text-white';
  }

  // Actions
  onSelectPlan(plan: PremiumPlan): void {
    if (this.isActivePlan(plan)) return;
    this.selectedPlan = plan;
    this.showPlanModal = true;
  }

  confirmPlanSelection(): void {
    if (!this.selectedPlan) return;
    this.showPlanModal = false;
    this.processingPayment = true;

    this.premiumService.generatePaymentLink(this.selectedPlan.id).subscribe({
      next: (res) => {
        this.processingPayment = false;
        if (res.payment_link) {
          window.open(res.payment_link, '_blank');
        }
      },
      error: (err) => {
        this.processingPayment = false;
        this.showToastMessage('Gagal membuat link pembayaran. Silakan coba lagi.', 'error');
      }
    });
  }

  cancelSelection(): void {
    this.showPlanModal = false;
    this.selectedPlan = null;
  }

  onCancelSubscription(): void {
    this.showCancelModal = true;
  }

  confirmCancel(): void {
    this.showCancelModal = false;
    // No backend cancel endpoint yet — show info message
    this.showToastMessage(
      'Untuk membatalkan langganan, hubungi support di support@canducation.com',
      'error'
    );
  }

  dismissCancel(): void {
    this.showCancelModal = false;
  }

  toggleFaq(index: number): void {
    this.faqItems[index].open = !this.faqItems[index].open;
  }

  goToPremiumPlans(): void {
    this.router.navigate(['/premium-plans']);
  }

  // Utilities
  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount);
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'active') return this.isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700';
    if (status === 'expired') return this.isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700';
    return this.isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
  }

  getStatusLabel(status: string): string {
    if (status === 'active') return 'Aktif';
    if (status === 'expired') return 'Kedaluwarsa';
    return status;
  }

  private showToastMessage(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.showToast = false; }, 5000);
  }
}
