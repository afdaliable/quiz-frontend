import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseApiUrl = environment.apiUrl;
  private currentUser = new BehaviorSubject<any>(null);
  user$ = this.currentUser.asObservable();

  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<any> {
    const url = environment.production ?
      `${this.baseApiUrl}/user/profile` :
      '/api/user/profile';

    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => error);
      })
    );
  }

  getUserStats(): Observable<any> {
    const url = environment.production ?
      `${this.baseApiUrl}/user/stats` :
      '/api/user/stats';

    return this.http.get(url).pipe(
      catchError(error => {
        console.error('Error fetching user stats:', error);
        return throwError(() => error);
      })
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