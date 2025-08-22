import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    picture?: string;
  };
}

interface SessionValidationResponse {
  valid: boolean;
  userId?: string;
  message?: string;
}

interface Session {
  id: string;
  userId: string;
  createdAt: string;
  lastActive: string;
  userAgent: string;
  ipAddress: string;
  isCurrentSession: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();
  private baseUrl = environment.apiUrl;
  private sessionInvalidSubject = new BehaviorSubject<boolean>(false);
  sessionInvalid$ = this.sessionInvalidSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeUserState();
  }

  // Get the correct API URL for the endpoint
  private getApiUrl(endpoint: string): string {
    // In production, use the full URL with the domain
    if (environment.production) {
      // Remove leading slash if present
      if (endpoint.startsWith('/')) {
        endpoint = endpoint.substring(1);
      }
      
      // Use window.location.origin to get the base URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/api/${endpoint}`;
    } else {
      // In development, use the relative URL
      return `/api/${endpoint}`;
    }
  }

  /**
   * Generate a real JWT token for frontend-only mode
   */
  private generateJWTToken(userId: string, email: string): string {
    if (!environment.jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    // JWT Header
    const header = {
      "alg": "HS256",
      "typ": "JWT"
    };

    // JWT Payload - matching your backend's expected format
    const payload = {
      "sub": userId,
      "aud": "authenticated",
      "exp": Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
      "iat": Math.floor(Date.now() / 1000),
      "email": email,
      "phone": "",
      "app_metadata": {
        "provider": "email",
        "providers": ["email"]
      },
      "user_metadata": {
        "email": email,
        "email_verified": true,
        "phone_verified": false,
        "sub": userId
      },
      "role": "authenticated",
      "aal": "aal1",
      "amr": [
        {
          "method": "password",
          "timestamp": Math.floor(Date.now() / 1000)
        }
      ],
      "session_id": "mock-session-" + Date.now(),
      "is_anonymous": false
    };

    // Base64URL encode function
    const base64url = (source: any): string => {
      return CryptoJS.enc.Base64.stringify(source)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    };

    // Convert header and payload to Base64URL
    const encodedHeader = base64url(CryptoJS.enc.Utf8.parse(JSON.stringify(header)));
    const encodedPayload = base64url(CryptoJS.enc.Utf8.parse(JSON.stringify(payload)));

    // Create signature using environment secret
    const signature = base64url(CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, environment.jwtSecret));

    // Construct JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Mock login for frontend-only mode
   */
  mockLogin(username: string, password: string): Observable<AuthResponse> {
    // Simple mock authentication for development
    if (username && password) {
      const userId = '12e31b19-2ac8-492b-b38b-d7fe8233a978'; // Same as your Postman script
      const email = username.includes('@') ? username : `${username}@example.com`;
      
      // Generate real JWT token
      const jwtToken = this.generateJWTToken(userId, email);
      
      const mockResponse: AuthResponse = {
        access_token: jwtToken,
        token_type: 'Bearer',
        expires_in: 10 * 365 * 24 * 60 * 60, // 10 years in seconds
        refresh_token: 'mock-refresh-token-' + Date.now(),
        user: {
          id: userId,
          email: email,
          display_name: username,
          picture: 'https://via.placeholder.com/150'
        }
      };

      localStorage.setItem('token', mockResponse.access_token);
      localStorage.setItem('refresh_token', mockResponse.refresh_token);
      const userData = {
        id: mockResponse.user.id,
        email: mockResponse.user.email,
        display_name: mockResponse.user.display_name,
        picture: mockResponse.user.picture
      };
      localStorage.setItem('user', JSON.stringify(userData));
      this.setUser(userData);
      this.sessionInvalidSubject.next(false);

      console.log('Generated JWT Token:', jwtToken.substring(0, 50) + '...');

      return of(mockResponse);
    }

    return throwError(() => new Error('Invalid credentials'));
  }

  /**
   * Exchanges the authorization code for access token with the backend
   */
  exchangeCodeForToken(code: string): Observable<AuthResponse> {
    // In frontend-only mode, skip OAuth exchange
    if (environment.frontendOnly) {
      return throwError(() => new Error('OAuth not available in frontend-only mode'));
    }

    const url = this.getApiUrl('auth/google/callback');
    
    return this.http.post<AuthResponse>(
      url,
      { code },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          // Store refresh token for session management
          if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
          }
          const userData = {
            id: response.user.id,
            email: response.user.email,
            display_name: response.user.display_name,
            picture: response.user.picture
          };
          localStorage.setItem('user', JSON.stringify(userData));
          this.setUser(userData);
          // Reset session invalid flag when successfully logged in
          this.sessionInvalidSubject.next(false);
        }
      }),
      catchError(error => {
        console.error('Token exchange error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logs out the user by calling the backend logout endpoint
   */
  logout(): Observable<any> {
    // In frontend-only mode, just clear local storage
    if (environment.frontendOnly) {
      this.clearLocalStorage();
      return of({ success: true });
    }

    const refreshToken = localStorage.getItem('refresh_token');
    const token = this.getToken();
    
    if (!refreshToken) {
      // If no refresh token, just clear local storage
      this.clearLocalStorage();
      return of({ success: true });
    }
    
    const url = this.getApiUrl('auth/logout');
    
    // Include the auth token in the headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return this.http.post(
      url,
      { token: refreshToken },
      { 
        withCredentials: true,
        headers: headers
      }
    ).pipe(
      tap(() => {
        this.clearLocalStorage();
      }),
      catchError(error => {
        console.error('Logout error:', error);
        // Even if the server request fails, clear local storage
        this.clearLocalStorage();
        return of({ success: true }); // Return success anyway to ensure UI updates
      })
    );
  }

  /**
   * Clears local storage and resets user state
   */
  private clearLocalStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  // Add this method to allow other components to invalidate the session
  invalidateSession(): void {
    this.sessionInvalidSubject.next(true);
  }

  /**
   * Validates the current session with the backend
   */
  validateSession(): Observable<SessionValidationResponse> {
    // In frontend-only mode, always return valid for JWT tokens
    if (environment.frontendOnly) {
      const token = localStorage.getItem('token');
      if (token && token.includes('.')) { // JWT tokens contain dots
        return of({ valid: true, userId: '12e31b19-2ac8-492b-b38b-d7fe8233a978' });
      }
      return of({ valid: false, message: 'No valid JWT token found' });
    }

    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('token');
    
    if (!refreshToken || !accessToken) {
      this.invalidateSession();
      return of({ valid: false, message: 'No session token found' });
    }
    
    const url = this.getApiUrl('auth/validate-session');
    
    console.log('Validating session at URL:', url);
    console.log('Using access token:', accessToken ? 'Present' : 'Missing');
    
    return this.http.post<SessionValidationResponse>(
      url,
      { token: refreshToken },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    ).pipe(
      tap(response => {
        console.log('Session validation response:', response);
        if (!response.valid) {
          this.invalidateSession();
          this.clearLocalStorage();
        }
      }),
      catchError(error => {
        console.error('Session validation error:', error);
        // Only invalidate session for auth-related errors
        if (error.status === 401 || error.status === 403) {
          this.invalidateSession();
          this.clearLocalStorage();
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Gets all active sessions for the current user
   */
  getUserSessions(): Observable<Session[]> {
    const user = this.getCurrentUser();
    const accessToken = localStorage.getItem('token');
    
    if (!user || !user.id || !accessToken) {
      return of([]);
    }
    
    const url = this.getApiUrl(`auth/sessions/${user.id}`);
    
    return this.http.get<Session[]>(
      url,
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    ).pipe(
      catchError(error => {
        console.error('Get sessions error:', error);
        return throwError(() => error);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  setUser(user: any): void {
    this.userSubject.next(user);
  }

  getCurrentUser(): any {
    return this.userSubject.getValue();
  }

  initializeUserState(): void {
    const token = this.getToken();
    if (token) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          this.setUser(user);
          
          // Validate the session on initialization with a small delay
          // to ensure the backend has time to recognize the token
          setTimeout(() => {
            console.log('Validating session on initialization');
            this.validateSession().subscribe({
              next: (response) => {
                console.log('Session validation response:', response);
                if (!response.valid) {
                  console.log('Session invalid on initialization, clearing storage');
                  this.clearLocalStorage();
                }
              },
              error: (error) => {
                console.error('Error validating session on initialization:', error);
                // Only clear storage for auth-related errors
                if (error.status === 401 || error.status === 403) {
                  this.clearLocalStorage();
                }
              }
            });
          }, 500); // 500ms delay
        } catch (e) {
          console.error('Error parsing user data', e);
          this.clearLocalStorage(); // Clear invalid data
        }
      }
    }
  }

  /**
   * Refreshes the access token using the refresh token
   */
  refreshToken(): Observable<any> {
    console.log('Attempting to refresh token');
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      console.error('No refresh token available');
      return of({ success: false, message: 'No refresh token available' });
    }
    
    const url = this.getApiUrl('auth/refresh-token');
    
    return this.http.post<any>(
      url,
      { refresh_token: refreshToken },
      { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    ).pipe(
      tap(response => {
        console.log('Token refresh response received');
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          // Update refresh token if provided
          if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
          }
          // Reset session invalid flag
          this.sessionInvalidSubject.next(false);
          return { success: true };
        }
        return { success: false, message: 'Invalid response from server' };
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        
        // If refresh token is invalid, try to validate session as fallback
        return this.validateSession().pipe(
          switchMap(validationResponse => {
            if (validationResponse.valid) {
              console.log('Session is still valid despite refresh token error');
              return of({ success: true });
            }
            return of({ success: false, message: 'Session validation failed' });
          }),
          catchError(validationError => {
            console.error('Session validation also failed:', validationError);
            return of({ success: false, message: 'Both refresh and validation failed' });
          })
        );
      })
    );
  }
}
