import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import {
  SimulasiUjian,
  SimulasiUserAttempt,
  SimulasiUjianService,
} from '../services/simulasi-ujian.service';

@Component({
  selector: 'app-simulasi-ujian',
  templateUrl: './simulasi-ujian.component.html',
  styleUrls: ['./simulasi-ujian.component.css'],
})
export class SimulasiUjianComponent implements OnInit, OnDestroy {
  simulasiList: SimulasiUjian[] = [];
  loading = true;
  isDarkMode = false;

  selectedSimulasi: SimulasiUjian | null = null;
  showDetailModal = false;
  startingSimulasi = false;
  detailAttempts: SimulasiUserAttempt[] = [];

  errorMessage: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private service: SimulasiUjianService,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.darkMode$.subscribe(isDark => (this.isDarkMode = isDark)),
    );
    this.loadSimulasi();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadSimulasi(): void {
    this.loading = true;
    this.service.getListSimulasi().subscribe({
      next: (data) => {
        this.simulasiList = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load simulasi:', err);
        this.errorMessage = 'Gagal memuat daftar simulasi. Coba lagi nanti.';
        this.loading = false;
      },
    });
  }

  openDetail(sim: SimulasiUjian): void {
    this.selectedSimulasi = sim;
    this.showDetailModal = true;
    this.detailAttempts = [];
    this.service.getMyAttempts(sim.id).subscribe({
      next: (list) => (this.detailAttempts = list),
      error: () => (this.detailAttempts = []),
    });
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedSimulasi = null;
    this.detailAttempts = [];
  }

  startSimulasi(sim: SimulasiUjian): void {
    if (sim.is_premium) {
      // Premium gate — let backend enforce; redirect if user can't access.
    }
    if (sim.can_attempt === false) {
      this.errorMessage = 'Batas attempt sudah tercapai untuk simulasi ini.';
      return;
    }

    this.startingSimulasi = true;
    this.service.startSimulasi(sim.id).subscribe({
      next: (res) => {
        // Wire localStorage to reuse the existing question component flow.
        localStorage.setItem('durasi', String(res.duration_minutes));
        localStorage.setItem('quizMode', 'simulasi');
        localStorage.setItem('selectedPaket', JSON.stringify({
          id: sim.paket_soal_id ?? 0,
          id_nama_paket_soal: sim.paket_soal_id ?? 0,
          kategori_soal: sim.paket_soal_nama ?? 'Simulasi Ujian',
          nama_paket_soal: sim.nama_simulasi,
          jumlah_soal: res.total_questions,
          is_premium: sim.is_premium,
          created_at: new Date().toISOString(),
        }));
        localStorage.setItem('simulasiData', JSON.stringify({
          simulasi_id: res.simulasi_id,
          attempt_number: res.attempt_number,
          passing_score: res.passing_score,
          session_id: res.session_id,
        }));
        // Pre-load the questions just like random session does, so question.component
        // can pick them up without an extra fetch.
        localStorage.setItem('simulasiSessionData', JSON.stringify({
          session_id: res.session_id,
          total_questions: res.total_questions,
          questions: res.questions,
          nama_paket_soal: sim.nama_simulasi,
          kategori_soal: sim.paket_soal_nama ?? 'Simulasi Ujian',
          navigation_mode: res.navigation_mode ?? 'free',
          sections: res.sections ?? [],
        }));

        this.startingSimulasi = false;
        this.router.navigate(['/question']);
      },
      error: (err) => {
        console.error('Failed to start simulasi:', err);
        this.errorMessage = err?.error?.error || 'Gagal memulai simulasi.';
        this.startingSimulasi = false;
      },
    });
  }

  getStatusLabel(sim: SimulasiUjian): string {
    if (sim.can_attempt === false) return 'Batas tercapai';
    if ((sim.user_attempts ?? 0) > 0) return 'Coba lagi';
    return 'Mulai';
  }

  getDurationLabel(minutes: number): string {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
    }
    return `${minutes} menit`;
  }

  formatDate(d?: string): string {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch {
      return d;
    }
  }
}
