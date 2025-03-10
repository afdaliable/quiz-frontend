import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
    private formBuilder: FormBuilder,
    private route: ActivatedRoute
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
    
    // Check for error query parameter (from auth callback)
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['error'];
      }
    });
    
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
      
      if (error) {
        // Check if the error is related to email verification
        if (error.message.includes('Email not confirmed') || 
            error.message.includes('Email not verified') ||
            error.message.toLowerCase().includes('verify')) {
          // Redirect to verification page
          this.router.navigate(['/verification'], { 
            queryParams: { email }
          });
          return;
        }
        throw error;
      }
      
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

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    this.loading = true;
    
    try {
      const { data, error } = await this.supabaseService.signInWithGoogle();
      
      if (error) throw error;
      
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


