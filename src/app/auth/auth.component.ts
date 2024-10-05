// src/app/auth/auth.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  template: `
    <div>
      <h2>Masukkan Password</h2>
      <input type="password" [(ngModel)]="password" />
      <button (click)="authenticate()">Submit</button>
    </div>
  `,
})
export class AuthComponent {
  password: string = '';

  constructor(private router: Router) {}

  authenticate(): void {
    if (this.password === 'password_yang_benar') {
      localStorage.setItem('isAuthenticated', 'true');
      this.router.navigate(['/daftar-soal']);
    } else {
      alert('Password salah!');
    }
  }
}
