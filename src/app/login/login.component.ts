import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  @Output() closePopup = new EventEmitter<void>();

  loginData = {
    email: '',
    password: '',
  };

  errorMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  onSubmit() {
    this.authService.signIn(
      this.loginData.email,
      this.loginData.password
    ).subscribe({
      next: (response) => {
        if (response?.access_token) {
          const userData = {
            display_name: response.user.display_name,
            email: response.user.email
          };
          this.userService.setUser(userData);
          this.router.navigate(['/home']);
          this.closePopup.emit();
        }
      },
      error: (error) => {
        console.error('Login failed', error);
        this.errorMessage = error.message || 'Login failed. Please try again.';
      }
    });
  }
}
