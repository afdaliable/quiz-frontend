import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { SupabaseService } from '../services/supabase.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  loginForm: FormGroup;
  loading = false;
  errorMessage: string = '';
  showPassword = false;
  private sessionSubscription: Subscription | null = null;
  private isRedirecting = false;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private supabaseService: SupabaseService,
    private formBuilder: FormBuilder
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if already logged in, but don't redirect (let app component handle it)
    if (this.supabaseService.currentSession) {
      console.log('Already logged in in login component');
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    
    this.errorMessage = '';
    this.loading = true;
    
    try {
      const { email, password } = this.loginForm.value;
      const { data, error } = await this.supabaseService.signInWithPassword(email, password);
      
      if (error) throw error;
      
      // Check if we have a session
      if (data?.session) {
        console.log('Login successful, navigating to home');
        this.router.navigate(['/home']);
      } else {
        throw new Error('No session returned from Supabase');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      this.errorMessage = error.message || 'Login failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async signInWithMagicLink(): Promise<void> {
    if (!this.loginForm.get('email')?.valid) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }
    
    this.errorMessage = '';
    this.loading = true;
    
    try {
      const email = this.loginForm.value.email;
      const { error } = await this.supabaseService.signInWithOtp(email);
      
      if (error) throw error;
      
      alert('Check your email for the login link!');
    } catch (error: any) {
      console.error('Magic link failed:', error);
      this.errorMessage = error.message || 'Failed to send magic link. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}


