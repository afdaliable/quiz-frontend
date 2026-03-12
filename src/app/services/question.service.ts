import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, throwError, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { QuizHistoryResponse } from '../models/quiz-history.model';

interface ApiResponse {
  kategori_id: number;
  nama_kategori: string;
  paket_soal_id: number;
  nama_paket_soal: string;
  kumpulan_soal: {
    id: number;
    soal: string;
    question_type?: string;
    opt1: string | null;
    opt2: string | null;
    opt3: string | null;
    opt4: string | null;
    opt5: string | null;
    correct_answer: string;
    solution: string;
  }[];
}

export interface Question {
  id: number;
  questionText: string;
  question_type: string;
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

  // Get the correct API URL for the endpoint
  private getApiUrl(endpoint: string): string {
    // In production, use the full URL with the domain
    if (environment.production) {
      // Remove leading slash if present
      if (endpoint.startsWith('/')) {
        endpoint = endpoint.substring(1);
      }
      
      // Use window.location.origin to get the base URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/${endpoint}`;
    } else {
      // In development, use the relative URL
      return `/api/${endpoint}`;
    }
  }

  getListPaketSoal(): Observable<any> {
    const url = this.getApiUrl('listpaketsoal');
    
    console.log('Getting paket soal list from URL:', url);
    
    return this.http.get(url, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('QuestionService Error:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  getQuestions(kategori: string, namaPaket: string): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      this.router.navigate(['/login']);
      return throwError(() => new Error('No token found'));
    }

    // Get the selected paket from localStorage
    const selectedPaketStr = localStorage.getItem('selectedPaket');
    if (!selectedPaketStr) {
      console.error('No selected paket found in localStorage');
      return throwError(() => new Error('No selected paket found'));
    }

    try {
      const selectedPaket = JSON.parse(selectedPaketStr);
      // Use either id or id_nama_paket_soal for the quiz ID
      const quizId = selectedPaket.id || selectedPaket.id_nama_paket_soal;
      
      if (!quizId) {
        console.error('Invalid quiz ID:', selectedPaket);
        return throwError(() => new Error('Invalid quiz ID'));
      }

      console.log(`Fetching questions for quiz ID: ${quizId}`);
      
      const url = this.getApiUrl(`paket-soal-response/${kategori}/${namaPaket}`);
      
      console.log('Getting questions from URL:', url);
      
      return this.http.get<any>(url, {
        withCredentials: true
      }).pipe(
        map(response => {
          console.log('Question API response:', response);
          
          // Check if access is denied for premium quiz
          if (response.success === false && response.message?.includes('premium')) {
            console.error('Premium access denied:', response.message);
            this.router.navigate(['/home'], { 
              queryParams: { message: 'Premium subscription required to access this quiz.' } 
            });
            return [];
          }
          
          // Handle different response structures
          let questions = [];
          
          if (response.kumpulan_soal) {
            // Direct questions array in response
            questions = response.kumpulan_soal;
          } else if (response.quiz_package && response.quiz_package.kumpulan_soal) {
            // Questions nested in quiz_package
            questions = response.quiz_package.kumpulan_soal;
          } else if (Array.isArray(response)) {
            // Response is directly an array of questions
            questions = response;
          } else {
            console.error('Unexpected response structure:', response);
            return [];
          }
          
          // Transform questions to match the expected format
          return questions.map((q: any) => {
            const questionType: string = q.question_type || 'multiple_choice';
            const allOptions = [
              { text: q.opt1, correct: q.correct_answer === 'opt1' },
              { text: q.opt2, correct: q.correct_answer === 'opt2' },
              { text: q.opt3, correct: q.correct_answer === 'opt3' },
              { text: q.opt4, correct: q.correct_answer === 'opt4' },
              { text: q.opt5, correct: q.correct_answer === 'opt5' },
            ];
            // Filter out null / empty options
            const options = allOptions.filter(
              o => o.text != null && String(o.text).trim() !== ''
            );
            return {
              id: q.id,
              questionText: q.soal,
              question_type: questionType,
              options,
              solution: q.solution,
            };
          });
        }),
        catchError(error => {
          console.error('Error fetching questions:', error);
          
          if (error.status === 401) {
            console.error('Unauthorized access, clearing token');
            localStorage.clear();
            this.router.navigate(['/login']);
          }
          
          return throwError(() => error);
        })
      );
    } catch (error) {
      console.error('Error parsing selected paket:', error);
      return throwError(() => error);
    }
  }

  getQuizHistory(page: number = 1, limit: number = 20): Observable<QuizHistoryResponse> {
    const url = this.getApiUrl(`user/quiz-history?page=${page}&limit=${limit}`);
    return this.http.get<QuizHistoryResponse>(url, { withCredentials: true }).pipe(
      catchError(error => {
        console.error('Error fetching quiz history:', error);
        return throwError(() => error);
      })
    );
  }

  getAllCategories(): Observable<any> {
    const url = this.getApiUrl('semuaKategori');
    
    console.log('Getting categories from URL:', url);

    return this.http.get(url, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching categories:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
