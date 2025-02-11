import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root',
})
export class DaftarSoalService {
  private apiUrl = environment.apiUrl + '/soalsoal';
  constructor(private http: HttpClient, private router: Router) {}

  getSoalList(): Observable<any[]> {
    return this.http.get<any[]>('/api/soalsoal', {
      withCredentials: true
    }).pipe(
      catchError((error) => {
        console.error('Error fetching soal list:', error);
        if (error.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(
          () => new Error('Terjadi kesalahan saat mengambil daftar soal')
        );
      })
    );
  }
}
