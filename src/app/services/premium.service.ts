import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Define interfaces for better type safety
export interface PremiumPlan {
  id: number;
  name: string;
  price: number;
  duration_days?: number;
  is_lifetime?: boolean;
  features: string[];
}

export interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

// New interfaces for Mayar license payment flow
export interface PaymentLinkResponse {
  payment_link: string;
}

export interface LicenseVerificationRequest {
  license_code: string;
  product_id: string;
  email: string;
  name: string;
  phone?: string;
}

export interface LicenseVerificationResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
  };
  subscription: {
    id: number;
    plan_id: number;
    plan_name: string;
    expired_at: string;
    is_lifetime: boolean;
  };
}

export interface UserLicense {
  id: number;
  license_code: string;
  user_id: string;
  plan_id: number;
  plan_name: string;
  status: string;
  expired_at: string;
  days_remaining: number;
}

// Legacy interfaces - kept for backward compatibility
export interface PaymentResponse {
  payment_link?: string;
  payment_url?: string;
  transaction_id?: string;
  link?: string;
  transactionId?: string;
}

export interface PaymentStatus {
  transaction_id: string;
  status: string;
  subscription_id?: number;
}

export interface QuizAccessResponse {
  has_access: boolean;
  required_plan_name?: string;
}

export interface PhoneCheckResponse {
  has_phone: boolean;
  can_proceed: boolean;
  phone_number?: string | null;
  user_id?: string;
}

export interface PhoneUpdateResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PremiumService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Helper methods for headers and user ID
  private createHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const userId = this.getUserId();
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Add user_id headers if available
    if (userId) {
      headers = headers.set('User_id', userId);
      headers = headers.set('user_id', userId);
      console.log('Added User_id and user_id headers:', userId);
    }
    
    return headers;
  }

  private getUserId(): string | null {
    const user = this.authService.getCurrentUser();
    return user ? user.id : null;
  }

  // Get premium plans
  getPremiumPlans(): Observable<PremiumPlan[]> {
    const url = `${this.apiUrl}/premium/plans`;
    const headers = this.createHeaders();
    
    return this.http.get<PremiumPlan[]>(url, { headers }).pipe(
      retry(1),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching premium plans:', error);
        return throwError(() => new Error('Failed to load premium plans. Please try again later.'));
      })
    );
  }

  // Get active subscription
  getActiveSubscription(): Observable<Subscription | null> {
    const url = `${this.apiUrl}/premium/subscriptions/active`;
    const headers = this.createHeaders();
    
    return this.http.get<Subscription>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404 || error.status === 401) {
          // No active subscription or unauthorized
          return of(null);
        }
        console.error('Error fetching active subscription:', error);
        return throwError(() => new Error('Failed to check subscription status. Please try again later.'));
      })
    );
  }

  // Check if user has access to a quiz
  checkQuizAccess(quizId: number): Observable<QuizAccessResponse> {
    const url = `${this.apiUrl}/premium/check-access`;
    const headers = this.createHeaders();
    const body = { quiz_id: quizId };
    
    return this.http.post<QuizAccessResponse>(url, body, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error checking quiz access:', error);
        if (error.status === 401 || error.status === 403) {
          // Return a response indicating no access
          return of({ has_access: false, required_plan_name: 'Premium' });
        }
        return throwError(() => new Error('Failed to check quiz access. Please try again later.'));
      })
    );
  }

  // NEW METHODS FOR MAYAR LICENSE PAYMENT FLOW

  // Generate payment link
  generatePaymentLink(planId: number): Observable<PaymentLinkResponse> {
    console.log('Generating payment link for plan ID:', planId);
    
    const url = `${this.apiUrl}/license/payment-link/${planId}`;
    const headers = this.createHeaders();
    const userId = this.getUserId();
    
    if (!userId) {
      console.error('No user ID available for payment link generation');
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    console.log('Request headers for payment link:', headers);
    
    return this.http.get<PaymentLinkResponse>(url, { headers }).pipe(
      tap(response => {
        console.log('Payment link generated successfully:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error generating payment link:', error);
        
        if (error.status === 401) {
          console.error('Unauthorized error. Token or User_id might be invalid.');
          return throwError(() => new Error('Authentication failed. Please log in again.'));
        }
        
        return throwError(() => new Error('Failed to generate payment link. Please try again later.'));
      })
    );
  }

  // Verify license
  verifyLicense(licenseData: LicenseVerificationRequest): Observable<LicenseVerificationResponse> {
    console.log('Verifying license with data:', licenseData);
    
    const url = `${this.apiUrl}/license-public/verify`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Validate required fields
    if (!licenseData.license_code || !licenseData.product_id || !licenseData.email || !licenseData.name) {
      console.error('Missing required license data fields');
      return throwError(() => new Error('Missing required license information. Please check your details.'));
    }
    
    console.log('Sending license verification request to:', url);
    
    return this.http.post<LicenseVerificationResponse>(url, licenseData, { headers }).pipe(
      tap(response => {
        console.log('License verification successful:', response);
        
        // Store user info and token if available
        if (response.token && response.user) {
          console.log('Storing authentication data from license verification');
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error verifying license:', error);
        
        // Check for "License code already used" error
        if (error.status === 400 && error.error && 
            (error.error.message === 'License code already used' || error.error.error === 'License code already used')) {
          console.log('License code already used error detected');
          return throwError(() => ({ 
            status: error.status, 
            error: error.error, 
            message: 'License code already used' 
          }));
        }
        
        if (error.status === 400) {
          return throwError(() => new Error(error.error?.message || 'Invalid license information. Please check your details.'));
        } else if (error.status === 404) {
          return throwError(() => new Error('License not found. Please check your license code.'));
        } else if (error.status === 401 || error.status === 403) {
          return throwError(() => new Error('Authorization failed. Please try again.'));
        }
        
        return throwError(() => error);
      })
    );
  }

  // Get user licenses
  getUserLicenses(): Observable<UserLicense[]> {
    console.log('Fetching user licenses');
    
    const url = `${this.apiUrl}/license/user-licenses`;
    const headers = this.createHeaders();
    const userId = this.getUserId();
    
    if (!userId) {
      console.error('No user ID available for fetching licenses');
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    console.log('Request headers for user licenses:', headers);
    
    return this.http.get<UserLicense[]>(url, { headers }).pipe(
      tap(licenses => {
        console.log('User licenses fetched successfully:', licenses);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching user licenses:', error);
        
        if (error.status === 401) {
          console.error('Unauthorized error. Token or User_id might be invalid.');
          return throwError(() => new Error('Authentication failed. Please log in again.'));
        } else if (error.status === 404) {
          console.log('No licenses found for user');
          return of([]);
        }
        
        return throwError(() => new Error('Failed to load licenses. Please try again later.'));
      })
    );
  }

  // Check if user has a phone number
  checkUserPhone(): Observable<PhoneCheckResponse> {
    const userId = this.getUserId();
    console.log('Checking phone for user ID:', userId);
    
    if (!userId) {
      console.error('No user ID available');
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    const url = environment.production ? 
      `${this.apiUrl}/payment/check-phone/${userId}` : 
      `/api/payment/check-phone/${userId}`;
    
    console.log('Checking phone at URL:', url);
    const headers = this.createHeaders();
    
    return this.http.get<PhoneCheckResponse>(url, { headers }).pipe(
      tap(response => console.log('Phone check response:', response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error checking phone number:', error);
        
        // For testing purposes, if the endpoint doesn't exist, simulate a response
        if (error.status === 404 && !environment.production) {
          console.log('Endpoint not found, simulating response for testing');
          return of({
            has_phone: false,
            can_proceed: false,
            phone_number: null,
            user_id: userId
          });
        }
        
        return throwError(() => new Error('Failed to check phone number. Please try again later.'));
      })
    );
  }

  // Update user's phone number
  updatePhoneNumber(phoneNumber: string): Observable<PhoneUpdateResponse> {
    const userId = this.getUserId();
    console.log('Updating phone number for user ID:', userId);
    
    if (!userId) {
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    const url = environment.production ? 
      `${this.apiUrl}/user/update-phone` : 
      `/api/user/update-phone`;
    
    // Get headers from createHeaders and ensure User_id is set
    const headers = this.createHeaders()
      .set('User_id', userId) // Explicitly set User_id again to ensure it's present
      .set('user_id', userId); // Explicitly set user_id again to ensure it's present
    
    console.log('Headers for phone update:', headers);
    
    const payload = {
      user_id: userId,
      phone_number: phoneNumber
    };
    console.log('Sending phone update payload:', payload);
    
    return this.http.post<PhoneUpdateResponse>(url, payload, { headers }).pipe(
      tap(response => console.log('Phone update response:', response)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating phone number:', error);
        
        // For testing purposes, if the endpoint doesn't exist, simulate a success response
        if ((error.status === 404 || error.status === 401) && !environment.production) {
          console.log('Endpoint not found or unauthorized, simulating success response for testing');
          return of({
            success: true,
            message: 'Phone number updated successfully (simulated)'
          });
        }
        
        return throwError(() => new Error(`Failed to update phone number: ${error.message || 'Unknown error'}`));
      })
    );
  }

  // Create payment with phone number check
  createPaymentWithPhoneCheck(planId: number, redirectUrl: string): Observable<PaymentResponse> {
    console.log('Starting payment with phone check for plan:', planId);
    
    if (!planId || isNaN(planId)) {
      console.error('Invalid plan ID:', planId);
      return throwError(() => new Error('Invalid plan ID. Please select a valid plan.'));
    }
    
    return this.checkUserPhone().pipe(
      tap(phoneCheck => {
        console.log('Phone check result:', phoneCheck);
      }),
      switchMap(phoneCheck => {
        if (phoneCheck.can_proceed) {
          console.log('User has phone number, proceeding with payment for plan ID:', planId);
          // User has a phone number, proceed with payment
          return this.createPayment(planId, redirectUrl);
        } else {
          console.log('User does not have phone number, throwing error');
          // User doesn't have a phone number, return an error that will be handled by the component
          return throwError(() => new Error('PHONE_NUMBER_REQUIRED'));
        }
      })
    );
  }

  // Create payment
  createPayment(planId: number, redirectUrl: string): Observable<PaymentResponse> {
    console.log('Creating payment for plan ID:', planId);
    
    if (!planId || isNaN(planId)) {
      console.error('Invalid plan ID in createPayment:', planId);
      return throwError(() => new Error('Invalid plan ID. Please select a valid plan.'));
    }
    
    const url = environment.production ? 
      `${this.apiUrl}/payment/create` : 
      '/api/payment/create';
    
    const headers = this.createHeaders();
    const userId = this.getUserId();
    
    if (!userId) {
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    // Truncate userId if it's too long (max 36 characters for UUID)
    const truncatedUserId = userId.length > 36 ? userId.substring(0, 36) : userId;
    
    const payload = {
      plan_id: planId,
      redirect_url: redirectUrl,
      user_id: truncatedUserId
    };
    
    console.log('Payment creation payload:', payload);
    
    return this.http.post<PaymentResponse>(url, payload, { headers }).pipe(
      tap(response => {
        console.log('Payment created:', response);
        // Store transaction ID in local storage for later verification
        if (response.transaction_id) {
          localStorage.setItem('pending_transaction_id', response.transaction_id);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error creating payment:', error);
        
        // If we get a 500 error with a specific error message about the user_id being too long
        if (error.status === 500 && error.error && error.error.error && 
            error.error.error.includes('Data too long for column \'user_id\'')) {
          console.error('User ID too long for database. Using truncated ID.');
          // Try again with a shorter user_id
          const shorterPayload = {
            plan_id: planId,
            redirect_url: redirectUrl,
            user_id: truncatedUserId.substring(0, 20) // Try with even shorter ID
          };
          
          return this.http.post<PaymentResponse>(url, shorterPayload, { headers });
        }
        
        return throwError(() => new Error('Failed to process payment. Please try again later.'));
      })
    );
  }

  // Check payment status
  checkPaymentStatus(transactionId: string): Observable<PaymentStatus> {
    const userId = this.getUserId();
    
    if (!userId) {
      return throwError(() => new Error('User ID not available. Please log in again.'));
    }
    
    const url = environment.production ? 
      `${this.apiUrl}/payment/check/${transactionId}?user_id=${userId}` : 
      `/api/payment/check/${transactionId}?user_id=${userId}`;
    
    const headers = this.createHeaders();
    
    return this.http.get<PaymentStatus>(url, { headers }).pipe(
      retry(1),
      tap(status => console.log('Payment status:', status)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error checking payment status:', error);
        return throwError(() => new Error('Failed to check payment status. Please try again later.'));
      })
    );
  }
} 