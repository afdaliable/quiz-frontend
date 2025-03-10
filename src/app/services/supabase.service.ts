import { Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  AuthSession,
  createClient,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface Profile {
  id?: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  website?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private _session = new BehaviorSubject<AuthSession | null>(null);
  private _user = new BehaviorSubject<User | null>(null);
  
  session$ = this._session.asObservable();
  user$ = this._user.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // Initialize session
    this.loadSession();
    
    // Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event);
      this._session.next(session);
      this._user.next(session?.user || null);
    });
  }

  private async loadSession() {
    try {
      const { data } = await this.supabase.auth.getSession();
      console.log('Initial session loaded:', data.session ? 'Session exists' : 'No session');
      this._session.next(data.session);
      this._user.next(data.session?.user || null);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }

  get currentSession() {
    return this._session.value;
  }

  get currentUser() {
    return this._user.value;
  }

  // Sign in with email and password
  async signInWithPassword(email: string, password: string) {
    try {
      console.log('Attempting to sign in with password');
      const response = await this.supabase.auth.signInWithPassword({ email, password });
      
      // Update session state if login was successful
      if (response.data?.session) {
        console.log('Sign in successful, updating session state');
        this._session.next(response.data.session);
        this._user.next(response.data.user);
      } else if (response.error) {
        console.error('Sign in error:', response.error.message);
      }
      
      return response;
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      throw error;
    }
  }

  // Sign in with magic link (passwordless)
  async signInWithOtp(email: string) {
    return this.supabase.auth.signInWithOtp({ email });
  }

  // Sign up with email and password
  async signUp(email: string, password: string, userData?: { display_name?: string }) {
    const { data, error } = await this.supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData
      }
    });
    
    if (!error && data.user) {
      // Create profile entry
      await this.createProfile({
        id: data.user.id,
        username: email.split('@')[0],
        email: email,
        display_name: userData?.display_name || email.split('@')[0],
      });
    }
    
    return { data, error };
  }

  // Sign out
  async signOut() {
    try {
      console.log('Signing out');
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      
      // Clear session state
      console.log('Sign out successful, clearing session state');
      this._session.next(null);
      this._user.next(null);
      
      return { error: null };
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId: string) {
    return this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
  }

  // Create profile
  async createProfile(profile: Profile) {
    return this.supabase
      .from('profiles')
      .upsert(profile);
  }

  // Update profile
  async updateProfile(profile: Partial<Profile> & { id: string }) {
    return this.supabase
      .from('profiles')
      .update(profile)
      .eq('id', profile.id);
  }

  // Upload avatar
  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;
    
    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
      
    // Update profile with avatar URL
    await this.updateProfile({
      id: userId,
      avatar_url: data.publicUrl
    });
    
    return data.publicUrl;
  }

  // Download avatar
  async downloadAvatar(path: string) {
    return this.supabase.storage
      .from('avatars')
      .download(path);
  }
} 