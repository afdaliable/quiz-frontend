import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseApiUrl = environment.apiUrl;
  private currentUser = new BehaviorSubject<any>(null);
  user$ = this.currentUser.asObservable();

  constructor(private http: HttpClient) {}

  private getApiUrl(path: string): string {
    return environment.production ? `${this.baseApiUrl}/${path}` : `/api/${path}`;
  }

  private getHttpOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }),
      withCredentials: true
    };
  }

  getUserProfile(): Observable<any> {
    return this.http.get(this.getApiUrl('user/profile')).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => error);
      })
    );
  }

  getUserStats(): Observable<any> {
    return this.http.get(this.getApiUrl('user/stats')).pipe(
      catchError(error => {
        console.error('Error fetching user stats:', error);
        return throwError(() => error);
      })
    );
  }

  getUserPreferences(): Observable<any> {
    return this.http.get(this.getApiUrl('user/preferences'), this.getHttpOptions()).pipe(
      catchError(() => of(null))
    );
  }

  updatePreferences(body: { pomodoro?: any; theme?: { dark_mode: boolean } }): Observable<any> {
    return this.http.put(this.getApiUrl('user/preferences'), body, this.getHttpOptions()).pipe(
      catchError(() => of(null))
    );
  }

  setUser(user: any) {
    this.currentUser.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    return this.currentUser.value;
  }

  clearUser() {
    this.currentUser.next(null);
    localStorage.removeItem('user');
  }
}
