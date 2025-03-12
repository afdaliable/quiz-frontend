// // src/app/verification/verification.component.ts
// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { ThemeService } from '../services/theme.service';
// // import { SupabaseService } from '../services/supabase.service';

// @Component({
//   selector: 'app-verification',
//   templateUrl: './verification.component.html',
//   styleUrls: ['./verification.component.css']
// })
// export class VerificationComponent implements OnInit {
//   email: string = '';
//   isDarkMode: boolean = false;
//   resendLoading: boolean = false;
//   resendSuccess: boolean = false;
//   resendError: string = '';

//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private themeService: ThemeService,
//     // private supabaseService: SupabaseService
//   ) {}

//   ngOnInit(): void {
//     // Subscribe to theme changes
//     this.themeService.darkMode$.subscribe(
//       isDark => this.isDarkMode = isDark
//     );
    
//     // Get email from query params
//     this.route.queryParams.subscribe(params => {
//       this.email = params['email'] || '';
//     });
    
//     // Check if user is already verified and logged in
//     // const session = this.supabaseService.currentSession;
//     // if (session) {
//     //   // If user is already logged in, redirect to home
//     //   this.router.navigate(['/home']);
//     }
//   }

//   async resendVerificationEmail(): Promise<void> {
//     if (!this.email) {
//       this.resendError = 'Email address is required';
//       return;
//     }
    
//     this.resendLoading = true;
//     this.resendSuccess = false;
//     this.resendError = '';
    
//     try {
//       // Use OTP sign-in to resend verification email
//       // const { error } = await this.supabaseService.signInWithOtp(this.email);
      
     
      
//       this.resendSuccess = true;
//     } catch (error: any) {
//       console.error('Failed to resend verification email:', error);
//       this.resendError = error.message || 'Failed to resend verification email';
//     } finally {
//       this.resendLoading = false;
//     }
//   }

//   goToLogin(): void {
//     this.router.navigate(['/login'], { 
//       queryParams: { email: this.email } 
//     });
//   }
// }