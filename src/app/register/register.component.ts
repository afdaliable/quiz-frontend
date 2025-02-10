import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerData = {
    email: '',
    password: '',
    display_name: ''
  };

  errorMessage: string = '';
  showSuccessPopup: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    this.authService.signUp(
      this.registerData.email,
      this.registerData.password,
      this.registerData.display_name
    ).subscribe({
      next: (response) => {
        if (response?.access_token) {
          this.showSuccessPopup = true;
          setTimeout(() => {
            this.showSuccessPopup = false;
            this.router.navigate(['/home'])
              .then(() => {
                window.location.reload();
              });
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Registration failed', error);
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
