import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

interface ApiResponse {
  kategori_id: number;
  nama_kategori: string;
  paket_soal_id: number;
  nama_paket_soal: string;
  kumpulan_soal: {
    id: number;
    soal: string;
    opt1: string;
    opt2: string;
    opt3: string;
    opt4: string;
    opt5: string;
    correct_answer: string;
    solution: string;
  }[];
}

export interface Question {
  id: number;
  questionText: string;
  options: {
    text: string;
    correct: boolean;
  }[];
  solution: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuestionService {
  private baseApiUrl = `${environment.apiUrl}/paket-soal-response`;

  constructor(private http: HttpClient) {}

  getQuestions(kategori: string, paketSoal: string): Observable<Question[]> {
    const apiUrl = `${this.baseApiUrl}/${kategori}/${paketSoal}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return this.http.get<ApiResponse>(apiUrl, { headers }).pipe(
      map((response) => {
        console.log('Response received:', response);
        return this.transformQuestions(response.kumpulan_soal);
      })
    );
  }

  private transformQuestions(
    apiQuestions: ApiResponse['kumpulan_soal']
  ): Question[] {
    return apiQuestions.map((q) => ({
      id: q.id,
      questionText: q.soal,
      options: [
        { text: q.opt1, correct: q.correct_answer === 'opt1' },
        { text: q.opt2, correct: q.correct_answer === 'opt2' },
        { text: q.opt3, correct: q.correct_answer === 'opt3' },
        { text: q.opt4, correct: q.correct_answer === 'opt4' },
        { text: q.opt5, correct: q.correct_answer === 'opt5' },
      ],
      solution: q.solution,
    }));
  }

  getListPaketSoal(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/listpaketsoal`);
  }
}
