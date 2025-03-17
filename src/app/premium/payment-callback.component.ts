import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { PremiumService } from '../services/premium.service';
import { ThemeService } from '../services/theme.service';
import { catchError, finalize, switchMap, delay } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-payment-callback',
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.css']
})
export class PaymentCallbackComponent implements OnInit {
  status = 'checking';
  message = 'Checking payment status...';
  error = '';
  isDarkMode = false;
  isLoading = true;
  sessionRestored = false;
  transactionId: string | null = null;

  constructor(
    private router: Router,
    private premiumService: PremiumService,
    private themeService: ThemeService,
    private authService: AuthService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
    
    // Extract transaction ID from URL or localStorage first
    this.extractTransactionId();
    
    // Then validate session
    this.validateSession();
  }

  extractTransactionId(): void {
    // Check URL parameters for transaction_id or transactionId
    const urlParams = new URLSearchParams(window.location.search);
    const urlTransactionId = urlParams.get('transaction_id') || urlParams.get('transactionId');
    
    if (urlTransactionId) {
      console.log('Found transaction ID in URL parameters:', urlTransactionId);
      this.transactionId = urlTransactionId;
      // Store in local storage for future reference
      localStorage.setItem('pending_transaction_id', urlTransactionId);
    } else {
      // Get transaction ID from local storage
      this.transactionId = localStorage.getItem('pending_transaction_id');
    }
    
    if (!this.transactionId) {
      console.error('No transaction ID found in URL or localStorage');
    } else {
      console.log('Using transaction ID:', this.transactionId);
    }
  }

  validateSession(): void {
    console.log('Validating session before checking payment status');
    
    // Check if we have a token
    const token = this.authService.getToken();
    if (!token) {
      console.log('No token found, attempting to restore session');
      this.attemptSessionRestore();
      return;
    }
    
    // Add a small delay to ensure Angular has fully initialized
    timer(500).pipe(
      switchMap(() => this.authService.validateSession()),
      catchError(error => {
        console.error('Session validation error:', error);
        this.attemptSessionRestore();
        return of({ valid: false });
      })
    ).subscribe(response => {
      if (response.valid) {
        console.log('Session is valid, proceeding with payment check');
        this.sessionRestored = true;
        this.processPaymentCheck();
      } else {
        console.log('Session is invalid, attempting to restore');
        this.attemptSessionRestore();
      }
    });
  }

  attemptSessionRestore(): void {
    console.log('Attempting to restore session');
    
    // Try to refresh the token or restore session
    this.authService.refreshToken().pipe(
      catchError(error => {
        console.error('Failed to refresh token:', error);
        this.status = 'error';
        this.error = 'Your session has expired. Please log in again to check your payment status.';
        this.isLoading = false;
        
        // Redirect to login after a delay
        timer(3000).subscribe(() => {
          this.ngZone.run(() => {
            this.router.navigate(['/login'], { 
              queryParams: { 
                returnUrl: '/payment/callback',
                paymentPending: 'true',
                transactionId: this.transactionId || undefined
              } 
            });
          });
        });
        
        return of(null);
      })
    ).subscribe(result => {
      if (result && result.success) {
        console.log('Session restored successfully');
        this.sessionRestored = true;
        
        // Add a small delay to ensure the session is fully restored
        timer(1000).subscribe(() => {
          this.processPaymentCheck();
        });
      } else if (result) {
        console.log('Session restore returned but was not successful');
        this.status = 'error';
        this.error = 'Unable to restore your session. Please log in again to check your payment status.';
        this.isLoading = false;
      }
    });
  }

  processPaymentCheck(): void {
    if (!this.transactionId) {
      this.status = 'error';
      this.error = 'No transaction ID found. Please try again or contact support.';
      this.isLoading = false;
      return;
    }
    
    console.log('Checking payment status for transaction ID:', this.transactionId);
    // Check payment status
    this.checkPaymentStatus(this.transactionId);
  }

  checkPaymentStatus(transactionId: string): void {
    this.isLoading = true;
    
    this.premiumService.checkPaymentStatus(transactionId).pipe(
      finalize(() => {
        this.isLoading = false;
      }),
      catchError(error => {
        console.error('Payment status check error:', error);
        
        if (error.status === 401) {
          console.log('Unauthorized error during payment check, session might be expired');
          if (!this.sessionRestored) {
            // Only try to restore session once to avoid infinite loops
            this.attemptSessionRestore();
            return of(null);
          } else {
            this.status = 'error';
            this.error = 'Your session has expired. Please log in again to check your payment status.';
            
            // Redirect to login after a delay
            timer(3000).subscribe(() => {
              this.ngZone.run(() => {
                this.router.navigate(['/login'], {
                  queryParams: {
                    returnUrl: '/payment/callback',
                    transactionId: transactionId
                  }
                });
              });
            });
            
            return of(null);
          }
        }
        
        this.status = 'error';
        this.error = 'Failed to check payment status. Server may be unavailable.';
        return of(null);
      })
    ).subscribe(
      (data) => {
        if (!data) return; // Error already handled in catchError
        
        if (data.status === 'Completed') {
          this.status = 'success';
          this.message = 'Payment successful! You are now subscribed.';
          
          // Remove transaction ID from local storage
          localStorage.removeItem('pending_transaction_id');
          
          // Redirect to premium content after 3 seconds
          timer(3000).subscribe(() => {
            this.ngZone.run(() => {
              this.router.navigate(['/premium-plans']);
            });
          });
        } else if (data.status === 'Pending') {
          this.status = 'pending';
          this.message = 'Payment is still being processed. Please wait...';
          
          // Check again after 5 seconds
          timer(5000).subscribe(() => {
            this.checkPaymentStatus(transactionId);
          });
        } else {
          this.status = 'error';
          this.error = `Payment ${data.status.toLowerCase()}. Please try again.`;
          
          // Remove transaction ID from local storage
          localStorage.removeItem('pending_transaction_id');
        }
      }
    );
  }

  tryAgain(): void {
    this.router.navigate(['/premium-plans']);
  }

  login(): void {
    this.router.navigate(['/login'], { 
      queryParams: { 
        returnUrl: '/payment/callback',
        paymentPending: 'true',
        transactionId: this.transactionId || undefined
      } 
    });
  }
} 