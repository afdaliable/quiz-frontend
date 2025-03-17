# Premium Quiz Feature

This document outlines the implementation of the premium quiz feature in the quiz application.

## Overview

The premium quiz feature allows the application to mark certain quizzes as premium content, which requires a subscription to access. The feature includes:

1. Visual indicators for premium quizzes on the home page
2. Access control for premium content
3. A modal dialog that appears when a user tries to access premium content without a subscription
4. Integration with the existing subscription system

## Implementation Details

### 1. Model Updates

The `PaketSoal` model was updated to include an `is_premium` flag:

```typescript
export interface PaketSoal {
  id: number;
  nama_paket_soal: string;
  kategori_soal: string;
  jumlah_soal: number;
  is_premium?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### 2. Premium Access Modal

A new standalone component `PremiumAccessModalComponent` was created to display information about premium content and subscription options:

- Shows the name of the premium quiz the user tried to access
- Displays the benefits of premium subscription
- Shows available subscription plans (if any)
- Provides buttons to subscribe or dismiss the modal

### 3. Home Component Updates

The `HomeComponent` was updated to:

- Check the user's premium status on initialization
- Display premium badges on quiz cards
- Show access status indicators on premium quiz cards
- Handle premium access control when a user selects a quiz
- Display the premium access modal when needed

### 4. Premium Status Check

The application checks the user's premium status using the `PremiumService`:

```typescript
checkPremiumStatus(): void {
  console.log('Checking premium status...');
  this.premiumService.checkPremiumStatus().subscribe({
    next: (response) => {
      console.log('Premium status response:', response);
      
      if (response.success) {
        this.hasPremiumAccess = response.is_premium;
        console.log('User has premium access:', this.hasPremiumAccess);
        
        // If available plans are in the response, update them
        if (!this.hasPremiumAccess && response.available_plans) {
          this.availablePlans = response.available_plans;
          console.log('Available premium plans from status check:', this.availablePlans);
        }
      } else {
        console.error('Premium status check failed:', response);
        this.hasPremiumAccess = false;
      }
    },
    error: (error) => {
      console.error('Error checking premium status:', error);
      this.hasPremiumAccess = false;
      
      // Still try to load available plans if status check fails
      this.loadAvailablePlans();
    }
  });
}
```

### 5. Quiz Access Check

When a user selects a premium quiz, the application checks if they have access to that specific quiz:

```typescript
selectPaketSoal(paketSoal: PaketSoal): void {
  // Check if we have an auth token
  if (!this.authService.getToken()) {
    // Let the auth guard handle redirection
    console.log('No auth token when selecting paket soal');
    return;
  }
  
  // If it's a premium quiz, check access specifically for this quiz
  if (paketSoal.is_premium) {
    console.log('Checking access for premium quiz:', paketSoal.id);
    this.premiumService.checkQuizAccess(paketSoal.id).subscribe({
      next: (response) => {
        console.log('Quiz access response:', response);
        
        // If user has access, proceed to the quiz
        if (response.success && response.has_access) {
          console.log('User has access to premium quiz, proceeding');
          localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
          this.router.navigate(['/welcome']);
        } else {
          // If user doesn't have access, show the premium modal
          console.log('User does not have access to premium quiz, showing modal');
          this.selectedPremiumQuiz = paketSoal;
          this.showPremiumModal = true;
          
          // If there are available plans in the response, update our plans
          if (response.available_plans && response.available_plans.length > 0) {
            this.availablePlans = response.available_plans;
          }
        }
      },
      error: (error) => {
        console.error('Error checking quiz access:', error);
        // Show error message or fallback to general premium check
        if (this.hasPremiumAccess) {
          // If we know user has a subscription, let them proceed
          localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
          this.router.navigate(['/welcome']);
        } else {
          // Otherwise show the premium modal
          this.selectedPremiumQuiz = paketSoal;
          this.showPremiumModal = true;
        }
      }
    });
  } else {
    // For non-premium quizzes, proceed directly
    localStorage.setItem('selectedPaket', JSON.stringify(paketSoal));
    this.router.navigate(['/welcome']);
  }
}
```

### 6. Environment-Aware API Calls

All API calls in the `PremiumService` are environment-aware, using different URL formats for production and development:

```typescript
checkQuizAccess(quizId: number): Observable<any> {
  console.log('Checking access for quiz ID:', quizId);
  const url = environment.production ? 
    `${this.apiUrl}/premium/check-quiz-access/${quizId}` : 
    `/api/premium/check-quiz-access/${quizId}`;
  const headers = this.createHeaders();
  
  return this.http.get<any>(url, { headers }).pipe(
    tap(response => console.log('Quiz access check response:', response)),
    catchError((error: HttpErrorResponse) => {
      console.error('Error checking quiz access:', error);
      if (error.status === 401 || error.status === 403) {
        // Return a response indicating no access
        return of({ 
          success: false, 
          has_access: false, 
          message: "This quiz package requires a premium subscription" 
        });
      }
      return throwError(() => new Error('Failed to check quiz access. Please try again later.'));
    })
  );
}
```

## User Flow

1. User browses the quiz list on the home page
2. Premium quizzes are marked with a premium badge
3. When a user clicks on a premium quiz:
   - The application checks if the user has access to that specific quiz
   - If they have an active subscription with access to the quiz, they can proceed
   - If they don't have access, the premium access modal appears
4. From the modal, the user can:
   - Click "Subscribe Now" to go to the subscription plans page
   - Click "Maybe Later" to dismiss the modal and continue browsing

## API Integration

The feature integrates with the following backend API endpoints:

- `GET /premium/check-status` - Checks if the user has an active premium subscription
- `GET /premium/check-quiz-access/{paket_soal_id}` - Checks if the user has access to a specific quiz
- `GET /soal/list-paket` - Returns the list of quiz packages with the `is_premium` flag

## Testing

To test the premium quiz feature:

1. Ensure some quizzes are marked as premium in the database
2. Log in as a non-premium user and verify that:
   - Premium badges are displayed correctly
   - The premium access modal appears when trying to access premium content
3. Subscribe to a premium plan
4. Verify that premium content is now accessible

### Testing in Development Environment

For testing in the development environment:
1. The application uses `/api/` prefixed endpoints
2. Ensure your development server is properly configured to handle these endpoints
3. Check the browser console for detailed logs about API calls and responses

## Troubleshooting

If premium users can't access premium quizzes:

1. Check the browser console for error messages
2. Verify that the `/premium/check-quiz-access/{paket_soal_id}` endpoint is working correctly
3. Ensure the user's subscription is active and properly associated with their account
4. Check that the quiz is correctly marked as premium in the database

## Future Enhancements

Potential future enhancements for the premium quiz feature:

1. Add a filter to show only premium or only free quizzes
2. Implement a preview mode for premium quizzes (e.g., show the first few questions)
3. Add a "Featured Premium Quiz" section on the home page
4. Implement a trial system for premium content 