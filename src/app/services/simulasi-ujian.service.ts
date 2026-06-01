import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SimulasiUjian {
  id: number;
  nama_simulasi: string;
  deskripsi?: string;
  paket_soal_id?: number;
  paket_soal_nama?: string;
  generation_mode: string;
  exam_type?: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  is_premium: boolean;
  max_attempts: number;
  is_active: boolean;
  user_attempts?: number;
  best_score?: number;
  can_attempt?: boolean;
}

export interface SimulasiSection {
  name: string;
  count: number;
  section_duration_minutes?: number;
}

export interface StartSimulasiResponse {
  session_id: string;
  simulasi_id: number;
  attempt_number: number;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  navigation_mode: string;
  sections: SimulasiSection[];
  questions: any[];
}

export interface SimulasiUserAttempt {
  id: number;
  simulasi_id: number;
  quiz_session_id: string;
  attempt_number: number;
  score?: number;
  is_passed?: boolean;
  completed_at?: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SimulasiUjianService {
  constructor(private http: HttpClient) {}

  private apiUrl(path: string): string {
    if (environment.production) {
      return `${window.location.origin}/api${path}`;
    }
    return `/api${path}`;
  }

  getListSimulasi(): Observable<SimulasiUjian[]> {
    return this.http.get<SimulasiUjian[]>(this.apiUrl('/simulasi-ujian'));
  }

  getSimulasiDetail(id: number): Observable<SimulasiUjian> {
    return this.http.get<SimulasiUjian>(this.apiUrl(`/simulasi-ujian/${id}`));
  }

  startSimulasi(id: number): Observable<StartSimulasiResponse> {
    return this.http.post<StartSimulasiResponse>(this.apiUrl(`/simulasi-ujian/${id}/start`), {});
  }

  getMyAttempts(simulasiId: number): Observable<SimulasiUserAttempt[]> {
    return this.http.get<SimulasiUserAttempt[]>(this.apiUrl(`/simulasi-ujian/${simulasiId}/my-attempts`));
  }

  // Review a completed session — returns questions WITH correct_answer + user's answers
  getSessionReview(sessionId: string): Observable<SimulasiReviewResponse> {
    return this.http.get<SimulasiReviewResponse>(this.apiUrl(`/simulasi-ujian/session/${sessionId}/review`));
  }

  /**
   * Single source of truth for wiring a started simulasi into the shared
   * /question flow. Both the simulasi-ujian page and the home page call this
   * so the exam display is IDENTICAL regardless of entry point.
   */
  prepareSimulasiSession(sim: SimulasiUjian, res: StartSimulasiResponse): void {
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
    localStorage.setItem('simulasiSessionData', JSON.stringify({
      session_id: res.session_id,
      total_questions: res.total_questions,
      questions: res.questions,
      nama_paket_soal: sim.nama_simulasi,
      kategori_soal: sim.paket_soal_nama ?? 'Simulasi Ujian',
      navigation_mode: res.navigation_mode ?? 'free',
      sections: res.sections ?? [],
    }));
  }
}

export interface SimulasiReviewResponse {
  session_id: string;
  nama: string | null;
  sections: SimulasiSection[];
  questions: any[];
  answers: (number | null)[];
}
