// import { Injectable } from '@angular/core';
// import {
//   AuthChangeEvent,
//   AuthSession,
//   createClient,
//   Session,
//   SupabaseClient,
//   User,
// } from '@supabase/supabase-js';
// import { environment } from '../../environments/environment';
// import { BehaviorSubject } from 'rxjs';

// export interface Profile {
//   id?: string;
//   username: string;
//   email: string;
//   display_name?: string;
//   avatar_url?: string;
//   website?: string;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class SupabaseService {
// // private supabase: SupabaseClient;
//   private _session = new BehaviorSubject<AuthSession | null>(null);
//   private _user = new BehaviorSubject<User | null>(null);
  
//   session$ = this._session.asObservable();
//   user$ = this._user.asObservable();

//   constructor() {
//     // this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
//     // Initialize session
//     this.loadSession();
    
//     // Set up auth state change listener
//     // this.supabase.auth.onAuthStateChange((event, session) => {
//   //     console.log('Auth state change event:', event);
//   //     this._session.next(session);
//   //     this._user.next(session?.user || null);
//   //   });
//   // }

//   private async loadSession(retryCount = 0) {
//     try {
//       const { data } = await this.supabase.auth.getSession();
//       console.log('Initial session loaded:', data.session ? 'Session exists' : 'No session');
      
//       if (data.session) {
//         this._session.next(data.session);
//         this._user.next(data.session.user);
//       } else {
//         this._session.next(null);
//         this._user.next(null);
        
//         // If we're on the callback page, we might need to retry
//         // as the session might not be immediately available
//         if (window.location.pathname.includes('/auth/callback') && retryCount < 3) {
//           console.log(`No session found on callback page, retrying (${retryCount + 1}/3)...`);
//           setTimeout(() => this.loadSession(retryCount + 1), 1000);
//         }
//       }
//     } catch (error) {
//       console.error('Error loading session:', error);
//       this._session.next(null);
//       this._user.next(null);
//     }
//   }

//   get currentSession() {
//     return this._session.value;
//   }

//   get currentUser() {
//     return this._user.value;
//   }

//   // Check if user is authenticated
//   get isAuthenticated(): boolean {
//     return !!this._session.value;
//   }

//   // Sign in with email and password
//   async signInWithPassword(email: string, password: string) {
//     try {
//       console.log('Attempting to sign in with password');
//       const response = await this.supabase.auth.signInWithPassword({ email, password });
      
//       // Update session state if login was successful
//       if (response.data?.session) {
//         console.log('Sign in successful, updating session state');
//         this._session.next(response.data.session);
//         this._user.next(response.data.user);
//       } else if (response.error) {
//         console.error('Sign in error:', response.error.message);
//       }
      
//       return response;
//     } catch (error) {
//       console.error('Unexpected error during sign in:', error);
//       throw error;
//     }
//   }

//   // Sign in with magic link (passwordless)
//   async signInWithOtp(email: string) {
//     return this.supabase.auth.signInWithOtp({ email });
//   }

//   // Sign in with Google OAuth
//   async signInWithGoogle() {
//     try {
//       // Get the redirect URL from the environment configuration if available
//       const redirectTo = window.env?.googleOAuth?.redirectUri || 
//                         `${window.location.origin}/auth/callback`;
      
//       console.log('Starting Google OAuth flow with redirect to:', redirectTo);
      
//       // Use OAuth flow for Google authentication
//       return this.supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo,
//           queryParams: {
//             // Request offline access to get a refresh token
//             access_type: 'offline',
//             // Force consent screen to ensure refresh token is always provided
//             prompt: 'consent',
//             // Request profile and email scopes
//             scope: 'profile email'
//           }
//         }
//       });
//     } catch (error) {
//       console.error('Error initiating Google sign-in:', error);
//       throw error;
//     }
//   }

//   // Sign up with email and password
//   async signUp(email: string, password: string, userData?: { display_name?: string }) {
//     const { data, error } = await this.supabase.auth.signUp({ 
//       email, 
//       password,
//       options: {
//         data: userData,
//         emailRedirectTo: `${window.location.origin}/auth/callback`
//       }
//     });
    
//     if (!error && data.user) {
//       // Create profile entry
//       await this.createProfile({
//         id: data.user.id,
//         username: email.split('@')[0],
//         email: email,
//         display_name: userData?.display_name || email.split('@')[0],
//       });
//     }
    
//     return { data, error };
//   }

//   // Sign out
//   async signOut() {
//     try {
//       console.log('Signing out');
//       const { error } = await this.supabase.auth.signOut();
      
//       if (error) {
//         console.error('Sign out error:', error.message);
//         throw error;
//       }
      
//       // Clear session state
//       console.log('Sign out successful, clearing session state');
//       this._session.next(null);
//       this._user.next(null);
      
//       return { error: null };
//     } catch (error) {
//       console.error('Unexpected error during sign out:', error);
//       throw error;
//     }
//   }

//   // Handle auth callback (for OAuth providers like Google)
//   async handleAuthCallback(code: string) {
//     if (code) {
//       try {
//         console.log('Exchanging code for session...');
        
//         // Add a small delay to avoid race conditions with browser locks
//         await new Promise(resolve => setTimeout(resolve, 500));
        
//         const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
        
//         if (error) {
//           console.error('Error exchanging code for session:', error);
//           return { data: null, error };
//         }
        
//         console.log('Session exchange successful');
        
//         // Update session state
//         if (data?.session) {
//           this._session.next(data.session);
//           this._user.next(data.session.user);
//         }
        
//         return { data, error: null };
//       } catch (error) {
//         console.error('Unexpected error during auth callback:', error);
//         return { data: null, error };
//       }
//     }
//     return { data: null, error: new Error('No code provided') };
//   }

//   // Get user profile
//   async getProfile(userId: string) {
//     return this.supabase
//       .from('profiles')
//       .select('*')
//       .eq('id', userId)
//       .single();
//   }

//   // Create profile
//   async createProfile(profile: Profile) {
//     return this.supabase
//       .from('profiles')
//       .upsert(profile);
//   }

//   // Update profile
//   async updateProfile(profile: Partial<Profile> & { id: string }) {
//     return this.supabase
//       .from('profiles')
//       .update(profile)
//       .eq('id', profile.id);
//   }

//   // Upload avatar
//   async uploadAvatar(userId: string, file: File) {
//     const fileExt = file.name.split('.').pop();
//     const filePath = `${userId}/avatar.${fileExt}`;
    
//     const { error: uploadError } = await this.supabase.storage
//       .from('avatars')
//       .upload(filePath, file, { upsert: true });
      
//     if (uploadError) {
//       throw uploadError;
//     }
    
//     // Get public URL
//     const { data } = this.supabase.storage
//       .from('avatars')
//       .getPublicUrl(filePath);
      
//     // Update profile with avatar URL
//     await this.updateProfile({
//       id: userId,
//       avatar_url: data.publicUrl
//     });
    
//     return data.publicUrl;
//   }

//   // Download avatar
//   async downloadAvatar(path: string) {
//     return this.supabase.storage
//       .from('avatars')
//       .download(path);
//   }
// } 