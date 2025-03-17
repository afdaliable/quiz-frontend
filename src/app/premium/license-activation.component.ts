import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { PremiumService } from '../services/premium.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-license-activation',
  templateUrl: './license-activation.component.html',
  styleUrls: ['./license-activation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LicenseActivationComponent implements OnInit {
  isDarkMode = false;
  loading = false;
  success = false;
  error = '';
  
  // Form data
  licenseCode: string = '';
  email: string = '';
  name: string = '';
  phone: string = '';
  productId: string = '';
  
  constructor(
    public router: Router,
    private themeService: ThemeService,
    private premiumService: PremiumService
  ) { }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
    
    // Extract query parameters from URL
    this.getQueryParams();
  }
  
  getQueryParams(): void {
    const params = new URLSearchParams(window.location.search);
    this.licenseCode = params.get('licenseCode') || '';
    this.email = params.get('email') || '';
    this.productId = params.get('productId') || '';
    this.name = params.get('name') || '';
    this.phone = params.get('phone') || '';
    
    console.log('License activation parameters:', {
      licenseCode: this.licenseCode,
      email: this.email,
      productId: this.productId,
      name: this.name,
      phone: this.phone
    });
  }
  
  handleActivation(): void {
    // Validate required parameters
    if (!this.licenseCode || !this.productId || !this.email || !this.name) {
      this.error = 'Missing required parameters. Please check your information and try again.';
      console.error('Missing required license parameters:', {
        licenseCode: this.licenseCode ? 'present' : 'missing',
        productId: this.productId ? 'present' : 'missing',
        email: this.email ? 'present' : 'missing',
        name: this.name ? 'present' : 'missing'
      });
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    const licenseData = {
      license_code: this.licenseCode,
      product_id: this.productId,
      email: this.email,
      name: this.name,
      phone: this.phone
    };
    
    console.log('Submitting license verification with data:', licenseData);
    
    this.premiumService.verifyLicense(licenseData).subscribe({
      next: (result) => {
        console.log('License verification successful:', result);
        this.loading = false;
        this.success = true;
        
        // Store token and user info
        if (result.token) {
          localStorage.setItem('token', result.token);
          console.log('Token stored successfully');
        }
        
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          console.log('User info stored successfully');
        }
        
        // Clear any stored transaction or payment data
        localStorage.removeItem('pending_transaction_id');
        localStorage.removeItem('selected_plan_id');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        console.error('License verification failed:', error);
        console.log('Error response structure:', {
          status: error.status,
          errorObject: error.error,
          message: error.message
        });
        
        // Check for specific error message "License code already used"
        if (error.error && 
            ((error.error.message === 'License code already used') || 
             (error.error.error === 'License code already used')) || 
            (typeof error === 'object' && error.message === 'License code already used')) {
          console.log('License code already used, showing popup and redirecting to login');
          this.error = 'This license code has already been used. Please log in to access your subscription.';
          
          // Show popup alert
          alert('This license code has already been used. You will be redirected to the login page.');
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            this.router.navigate(['/login'], {
              queryParams: {
                returnUrl: '/',
                message: 'Please log in to access your subscription.'
              }
            });
          }, 1500);
          return;
        }
        
        // Handle other error types
        if (typeof error === 'string') {
          this.error = error;
        } else if (error.status === 400) {
          this.error = error.error?.message || 'Invalid license information. Please check your details and try again.';
        } else if (error.status === 404) {
          this.error = 'License not found. Please check your license code and try again.';
        } else if (error.status === 401 || error.status === 403) {
          this.error = 'Authorization failed. Please try again or contact support.';
        } else if (error.message) {
          this.error = error.message;
        } else {
          this.error = 'Failed to verify license. Please try again later or contact support.';
        }
        
        console.log('Displaying error to user:', this.error);
      }
    });
  }

  // Navigate to login page
  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/',
        message: 'Please log in to access your subscription.'
      }
    });
  }
} 