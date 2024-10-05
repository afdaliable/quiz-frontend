import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DaftarSoalService {
  private apiUrl = `${environment.apiUrl}/soalsoal`;

  constructor(private http: HttpClient) {}

   getSoalList(): Observable<any[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: environment.apiKey,
    });

    return this.http
      .get<any[]>(this.apiUrl, {
        headers,
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          console.error('Error fetching soal list:', error);
          return throwError(
            () => new Error('Terjadi kesalahan saat mengambil daftar soal')
          );
        })
      );
  }
}
