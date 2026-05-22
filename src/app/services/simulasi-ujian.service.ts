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

export interface StartSimulasiResponse {
  session_id: string;
  simulasi_id: number;
  attempt_number: number;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
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
}
