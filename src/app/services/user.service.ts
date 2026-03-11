import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, throwError, of } from 'rxjs';
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

    return this.http.get(url, {
      withCredentials: true
    }).pipe(
      catchError(error => {
        console.error('Error fetching user profile:', error);
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

  updatePreferences(prefs: { theme: string }): void {
    const url = environment.production ?
      `${this.baseApiUrl}/user/preferences` :
      '/api/user/preferences';

    this.http.patch(url, prefs, { withCredentials: true }).pipe(
      catchError(() => of(null))
    ).subscribe();
  }
}