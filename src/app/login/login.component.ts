import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginData = {
    email: '',
    password: ''
  };
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Login successful');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      }
    });
  }
}
