import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, throwError, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

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
  private baseApiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) {}

  getListPaketSoal(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    return this.http.get(`${this.baseApiUrl}/listpaketsoal`, { 
      headers,
      withCredentials: environment.production ? false : true 
    }).pipe(
      catchError(error => {
        console.error('Error fetching paket soal:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  getQuestions(kategori: string, paketSoal: string): Observable<Question[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');
      
    const apiUrl = `${this.baseApiUrl}/paket-soal-response/${kategori}/${paketSoal}`;
    
    return this.http.get<ApiResponse>(apiUrl, { 
      headers,
      withCredentials: true 
    }).pipe(
      map((response) => {
        console.log('Response received:', response);
        return this.transformQuestions(response.kumpulan_soal);
      }),
      catchError((error) => {
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
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
}
