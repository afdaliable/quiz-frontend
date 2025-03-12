import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  registerForm: FormGroup;
  loading = false;
  errorMessage: string = '';
  showPassword = false;
  showConfirmPassword = false;
  showSuccessPopup: boolean = false;
  private sessionSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private formBuilder: FormBuilder
  ) {
    this.registerForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      displayName: ['']
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if already logged in, but don't redirect (let app component handle it)
   
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      form.get('confirmPassword')?.setErrors(null);
      return null;
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }
    
    this.errorMessage = '';
    this.loading = true;
    
    try {
      const { email, password, displayName } = this.registerForm.value;
      
      
      
      this.showSuccessPopup = true;
      setTimeout(() => {
        this.showSuccessPopup = false;
        // Redirect to verification page instead of login
        this.router.navigate(['/verification'], { 
          queryParams: { 
            email: email
          } 
        });
      }, 2000);
    } catch (error: any) {
      console.error('Registration failed:', error);
      this.errorMessage = error.message || 'Registration failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    
    try {
  
      // The user will be redirected to Google's OAuth page
      // After authentication, they'll be redirected back to our app
      // No need to navigate manually here
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      this.errorMessage = error.message || 'Failed to sign in with Google. Please try again.';
      this.loading = false;
    }
  }
}
