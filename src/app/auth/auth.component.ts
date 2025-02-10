// src/app/auth/auth.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth',
  template: `
    <div>
      <h2>Masukkan Password</h2>
      <input type="password" [(ngModel)]="password" name="password" />
      <button (click)="authenticate()">Submit</button>
    </div>
  `,
  imports: [FormsModule],
})

export class AuthComponent {
  password: string = '';

  constructor(private router: Router) {}

  authenticate(): void {
    if (this.password === 'password_yang_benar') {
      localStorage.setItem('isAuthenticated', 'true');
      this.router.navigate(['/home']);
    } else {
      alert('Password salah!');
    }
  }
}
