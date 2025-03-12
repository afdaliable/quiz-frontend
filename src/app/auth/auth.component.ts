// src/app/auth/auth.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  template: `
    <div class="auth-container">
      <div class="auth-form">
        <h1 class="header">Sign in with Magic Link</h1>
        <p class="description">Enter your email below to receive a magic link for passwordless sign in</p>
        
        <form [formGroup]="signInForm" (ngSubmit)="onSubmit()" class="form-widget">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              formControlName="email"
              class="form-control"
              type="email"
              placeholder="Your email"
            />
            <div *ngIf="email?.invalid && (email?.dirty || email?.touched)" class="error-message">
              <div *ngIf="email?.errors?.['required']">Email is required</div>
              <div *ngIf="email?.errors?.['email']">Please enter a valid email</div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="loading || signInForm.invalid">
              {{ loading ? 'Sending...' : 'Send Magic Link' }}
            </button>
          </div>
          
          <div *ngIf="message" class="alert" [ngClass]="{'alert-success': !error, 'alert-danger': error}">
            {{ message }}
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .auth-form {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      background-color: white;
    }
    .header {
      margin-bottom: 1rem;
      text-align: center;
    }
    .description {
      margin-bottom: 2rem;
      text-align: center;
      color: #666;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    .form-actions {
      margin-top: 2rem;
    }
    .btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }
    .btn-primary:disabled {
      background-color: #93c5fd;
      cursor: not-allowed;
    }
    .alert {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 4px;
    }
    .alert-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    .alert-danger {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .error-message {
      color: #b91c1c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
  `],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class AuthComponent {
  signInForm: FormGroup;
  loading = false;
  message = '';
  error = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.signInForm.get('email');
  }

  async onSubmit(): Promise<void> {
    if (this.signInForm.invalid) {
      return;
    }
    
    try {
      this.loading = true;
      this.message = '';
      this.error = false;
      
      const email = this.signInForm.value.email;
      
      
      this.message = 'Check your email for the login link!';
    } catch (error: any) {
      this.error = true;
      this.message = error.message || 'An error occurred during sign in';
      console.error('Error:', error);
    } finally {
      this.loading = false;
    }
  }
}
