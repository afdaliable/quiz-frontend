import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PremiumOffer, PremiumService, PromoOffer } from '../services/premium.service';

/** "2h 05:12:33" dari jumlah detik. */
export function formatSisa(detik: number): string {
  const s = Math.max(0, Math.floor(detik));
  const hari = Math.floor(s / 86400);
  const jam = Math.floor((s % 86400) / 3600);
  const menit = Math.floor((s % 3600) / 60);
  const dtk = s % 60;
  const hms = [jam, menit, dtk].map(n => n.toString().padStart(2, '0')).join(':');
  return hari > 0 ? `${hari} hari ${hms}` : hms;
}

/**
 * Bilah tipis di bawah header: sisa trial, atau promo yang sedang berlaku,
 * lengkap dengan hitung mundur. Waktu mengikuti jam server, bukan jam perangkat.
 */
@Component({
  selector: 'app-premium-banner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div *ngIf="tampil" class="text-xs sm:text-sm">
      <div *ngIf="offer?.trial?.aktif && !offer?.langganan; else promoTpl"
        class="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white">
        <span>Trial premium aktif · sisa <b class="tabular-nums">{{ sisa(offer!.trial!.berakhir) }}</b></span>
        <a routerLink="/premium-plans" class="underline font-semibold whitespace-nowrap">Lihat paket</a>
        <button (click)="tutup()" class="ml-1 opacity-70 hover:opacity-100" aria-label="Tutup">✕</button>
      </div>
      <ng-template #promoTpl>
        <div *ngIf="promo as p" class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 bg-amber-500 text-gray-900">
          <span>{{ p.teks_banner || ('Diskon ' + p.persen + '% · ' + p.nama) }}</span>
          <b *ngIf="p.berakhir" class="tabular-nums">{{ sisa(p.berakhir) }}</b>
          <a routerLink="/premium-plans" class="underline font-semibold whitespace-nowrap">Pakai kode {{ p.kode }}</a>
          <button (click)="tutup()" class="ml-1 opacity-70 hover:opacity-100" aria-label="Tutup">✕</button>
        </div>
      </ng-template>
    </div>
  `,
})
export class PremiumBannerComponent implements OnInit, OnDestroy {
  offer: PremiumOffer | null = null;
  private selisih = 0;          // detik: jam server - jam perangkat
  private sekarang = Date.now() / 1000;
  private ditutup = false;
  private diHalamanTersembunyi = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private subs: Subscription[] = [];
  private userTerakhir: string | null = null;

  constructor(private auth: AuthService, private premium: PremiumService, private router: Router) {}

  ngOnInit(): void {
    this.subs.push(this.auth.user$.subscribe(user => {
      const id = user?.id ?? user?.sub ?? (user ? 'ada' : null);
      if (id === this.userTerakhir) return;
      this.userTerakhir = id;
      this.offer = null;
      if (user && this.auth.getToken()) this.muat();
    }));
    this.subs.push(this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects || e.url;
      this.diHalamanTersembunyi = ['/premium-plans', '/question', '/login', '/auth'].some(r => url.startsWith(r));
    }));
    this.timer = setInterval(() => (this.sekarang = Date.now() / 1000 + this.selisih), 1000);
  }

  private muat(): void {
    this.premium.getOffer().subscribe({
      next: o => {
        this.selisih = o.server_time - Date.now() / 1000;
        this.sekarang = o.server_time;
        this.offer = o;
      },
      error: () => { /* banner opsional */ },
    });
  }

  get promo(): PromoOffer | null {
    return this.offer?.promos.find(p => !p.berakhir || p.berakhir > this.sekarang) ?? null;
  }

  get tampil(): boolean {
    if (!this.offer || this.ditutup || this.diHalamanTersembunyi || this.offer.langganan) return false;
    if (this.offer.trial?.aktif) return this.offer.trial.berakhir > this.sekarang;
    return !!this.promo;
  }

  sisa(batas: number): string {
    return formatSisa(batas - this.sekarang);
  }

  tutup(): void {
    this.ditutup = true;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.timer) clearInterval(this.timer);
  }
}
