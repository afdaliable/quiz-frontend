import { Component, OnInit } from '@angular/core';
import { PremiumService } from '../services/premium.service';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-premium-plans',
  templateUrl: './premium-plans.component.html',
  styleUrls: ['./premium-plans.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PremiumPlansComponent implements OnInit {
  plans: any[] = [];
  activeSubscription: any = null;
  loading = true;
  error = '';
  isDarkMode = false;
  loadingSubscription = false;
  processingPayment = false;

  constructor(
    private premiumService: PremiumService,
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
    this.loadPlans();
    this.checkActiveSubscription();
  }

  loadPlans(): void {
    this.loading = true;
    this.error = '';
    
    this.premiumService.getPremiumPlans().pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (plans) => {
        this.plans = plans;
        console.log('Loaded premium plans:', plans);
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.error = 'Failed to load premium plans. Please try again.';
      }
    });
  }

  checkActiveSubscription(): void {
    this.loadingSubscription = true;
    
    this.premiumService.getActiveSubscription().pipe(
      finalize(() => {
        this.loadingSubscription = false;
      })
    ).subscribe({
      next: (subscription) => {
        this.activeSubscription = subscription;
        console.log('Active subscription:', subscription);
      },
      error: (error) => {
        console.error('Error checking subscription:', error);
        // Don't show error to user, just log it
      }
    });
  }

  subscribeToPlan(planId: number): void {
    if (this.processingPayment) {
      return; // Prevent multiple clicks
    }
    
    this.processingPayment = true;
    this.error = '';
    
    console.log('Subscribing to plan ID:', planId);
    
    // Generate payment link for the selected plan
    this.premiumService.generatePaymentLink(planId).subscribe({
      next: (response) => {
        console.log('Payment link generated:', response);
        
        // Redirect to Mayar payment page
        if (response.payment_link) {
          // Store the plan ID in localStorage in case we need it later
          localStorage.setItem('selected_plan_id', planId.toString());
          window.location.href = response.payment_link;
        } else {
          this.processingPayment = false;
          this.error = 'Invalid payment link received. Please try again.';
          console.error('Payment link is empty or invalid:', response);
        }
      },
      error: (error) => {
        this.processingPayment = false;
        console.error('Error generating payment link:', error);
        
        if (error.status === 401 || error.message?.includes('Authentication failed')) {
          this.error = 'Authentication failed. Please log in again to continue.';
          // Optionally redirect to login page after a delay
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { 
                returnUrl: '/premium-plans',
                error: 'Your session has expired. Please log in again to continue.'
              } 
            });
          }, 3000);
        } else {
          this.error = error.message || 'Failed to generate payment link. Please try again later.';
        }
      }
    });
  }

  hasAccess(planId: number): boolean {
    if (!this.activeSubscription) return false;
    return this.activeSubscription.plan_id >= planId;
  }

  retryLoading(): void {
    this.loadPlans();
    this.checkActiveSubscription();
  }
} 