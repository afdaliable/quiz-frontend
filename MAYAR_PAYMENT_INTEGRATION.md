# Mayar License Payment Flow Integration

This document provides an overview of the integration of the Mayar license payment flow into the application.

## Overview

The new payment flow works as follows:

1. User selects a premium plan and clicks "Subscribe Now"
2. Frontend calls the backend to generate a payment link
3. User is redirected to Mayar's payment page
4. After successful payment, Mayar redirects the user back to our activation page with a license code
5. Frontend verifies the license code with the backend
6. Backend creates a subscription and returns a JWT token
7. Frontend stores the token and redirects the user to the home page

## Changes Made

### 1. New Components

- **LicenseActivationComponent**: Handles the activation of licenses after payment.
  - Located at: `src/app/premium/license-activation.component.ts`
  - Template: `src/app/premium/license-activation.component.html`
  - Styles: `src/app/premium/license-activation.component.css`

### 2. Updated Services

- **PremiumService**: Updated to add new methods for the Mayar license payment flow.
  - `generatePaymentLink`: Generates a payment link for a selected plan.
  - `verifyLicense`: Verifies a license code with the backend.
  - `getUserLicenses`: Gets the user's active licenses.
  - Commented out old payment methods that are no longer needed.

### 3. Updated Components

- **PremiumPlansComponent**: Updated to use the new payment flow.
  - Removed the phone number check.
  - Added a loading state for payment processing.
  - Updated the UI to show a loading overlay during payment processing.

### 4. New Routes

- Added a new route for license activation at `/aktivasi-berlangganan`.

### 5. Updated App Module

- Updated the app module to include the new components.

## API Endpoints

### 1. Generate Payment Link

**Endpoint:** `GET /license/payment-link/{plan_id}`

**Headers:**
- `Authorization`: Bearer token

**Response:**
```json
{
  "payment_link": "https://canducation.myr.id/m/special-plan?email=user@example.com&productId=00ba4212-56ea-4b33-82c7-4eb0ee96d1c8&name=User%20Name&phone=628123456789&user_id=123"
}
```

### 2. Verify License

**Endpoint:** `POST /license-public/verify`

**Headers:**
- `Content-Type`: application/json

**Request Body:**
```json
{
  "license_code": "0C6A09CFA61BBB98",
  "product_id": "aedda011-50a6-4839-9109-3e413ad5b887",
  "email": "user@example.com",
  "name": "User Name",
  "phone": "628123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "License activated successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "display_name": "User Name"
  },
  "subscription": {
    "id": 1,
    "plan_id": 2,
    "plan_name": "Gold Plan",
    "expired_at": "2023-12-31T23:59:59Z",
    "is_lifetime": false
  }
}
```

### 3. Get User Licenses

**Endpoint:** `GET /license/user-licenses`

**Headers:**
- `Authorization`: Bearer token

**Response:**
```json
[
  {
    "id": 1,
    "license_code": "0C6A09CFA61BBB98",
    "user_id": "123",
    "plan_id": 2,
    "plan_name": "Gold Plan",
    "status": "Active",
    "expired_at": "2023-12-31T23:59:59Z",
    "days_remaining": 30
  }
]
```

## Testing Instructions

### 1. Test Premium Plans Page

1. Navigate to the premium plans page at `/premium-plans`.
2. Verify that the plans are displayed correctly.
3. Click on the "Subscribe Now" button for a plan.
4. Verify that the loading overlay is displayed.
5. Verify that you are redirected to the Mayar payment page.

### 2. Test License Activation Page

1. Navigate to the license activation page at `/aktivasi-berlangganan` with the following query parameters:
   - `licenseCode`: The license code from Mayar.
   - `email`: The user's email.
   - `productId`: The product ID from Mayar.
   - `name`: The user's name.
   - `phone`: The user's phone number (optional).
2. Verify that the form is populated with the query parameters.
3. Click on the "Activate Subscription" button.
4. Verify that the loading indicator is displayed.
5. Verify that the success message is displayed after successful activation.
6. Verify that you are redirected to the home page after a short delay.

### 3. Test Error Handling

1. Test with invalid license code:
   - Navigate to the license activation page with an invalid license code.
   - Verify that an error message is displayed.
2. Test with missing parameters:
   - Navigate to the license activation page without required parameters.
   - Verify that an error message is displayed.
3. Test with server errors:
   - Simulate a server error by providing invalid data.
   - Verify that an error message is displayed.

## Notes

- The phone number check has been removed from the premium plans page as it is no longer needed.
- The old payment methods have been commented out in the `PremiumService` as they are no longer needed.
- The license activation page is accessible without authentication to allow users to activate their licenses after payment.

## Troubleshooting

If you encounter any issues, please check the browser console for error messages. Common issues include:

- **401 Unauthorized**: The user is not authenticated. Make sure the user is logged in before accessing the premium plans page.
- **404 Not Found**: The API endpoint does not exist. Make sure the backend is running and the endpoints are correctly implemented.
- **500 Internal Server Error**: There was an error on the server. Check the server logs for more information.

If you need to manually test the license activation page, you can use the following URL:

```
http://localhost:4200/aktivasi-berlangganan?licenseCode=TEST123&email=test@example.com&productId=123&name=Test%20User&phone=628123456789
``` 