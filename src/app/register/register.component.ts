import { Component, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  @Output() closePopup = new EventEmitter<void>();

  registerData = {
    email: '',
    password: '',
    display_name: '',
  };

  errorMessage: string = '';
  showSuccessPopup: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onSubmit() {
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
            this.router.navigate(['/home']);
            this.closePopup.emit();
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Registration failed', error);
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
