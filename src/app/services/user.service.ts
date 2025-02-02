import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  constructor() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  setUser(user: any) {
    this.userSubject.next(user);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    return this.userSubject.value;
  }

  clearUser() {
    this.userSubject.next(null);
    localStorage.removeItem('user');
  }
}