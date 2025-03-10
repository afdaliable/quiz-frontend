import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { Profile } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html'
})
export class AccountComponent implements OnInit {
  loading = false;
  profile: Profile | null = null;
  profileForm: FormGroup;
  avatarUrl: string | null = null;
  uploadingAvatar = false;
  errorMessage = '';
  successMessage = '';
  isDarkMode = false;

  constructor(
    private supabaseService: SupabaseService,
    private formBuilder: FormBuilder,
    private router: Router,
    private themeService: ThemeService
  ) {
    this.profileForm = this.formBuilder.group({
      username: ['', Validators.required],
      display_name: [''],
      website: ['']
    });
  }

  async ngOnInit() {
    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    
    // Check if user is logged in
    const session = this.supabaseService.currentSession;
    if (!session) {
      this.router.navigate(['/login']);
      return;
    }

    await this.getProfile();
  }

  async getProfile() {
    try {
      this.loading = true;
      const userId = this.supabaseService.currentUser?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await this.supabaseService.getProfile(userId);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        this.profile = data;
        this.avatarUrl = data.avatar_url || null;
        
        this.profileForm.patchValue({
          username: data.username || '',
          display_name: data.display_name || '',
          website: data.website || ''
        });
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error loading profile';
      console.error('Error loading profile:', error);
    } finally {
      this.loading = false;
    }
  }

  async updateProfile() {
    try {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const userId = this.supabaseService.currentUser?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { error } = await this.supabaseService.updateProfile({
        id: userId,
        username: this.profileForm.value.username,
        display_name: this.profileForm.value.display_name,
        website: this.profileForm.value.website
      });
      
      if (error) {
        throw error;
      }
      
      this.successMessage = 'Profile updated successfully!';
    } catch (error: any) {
      this.errorMessage = error.message || 'Error updating profile';
      console.error('Error updating profile:', error);
    } finally {
      this.loading = false;
    }
  }

  async uploadAvatar(event: any) {
    try {
      this.uploadingAvatar = true;
      this.errorMessage = '';
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      
      const userId = this.supabaseService.currentUser?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
      
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        throw new Error('File type not supported. Please upload an image file.');
      }
      
      const newAvatarUrl = await this.supabaseService.uploadAvatar(userId, file);
      this.avatarUrl = newAvatarUrl;
      this.successMessage = 'Avatar updated successfully!';
    } catch (error: any) {
      this.errorMessage = error.message || 'Error uploading avatar';
      console.error('Error uploading avatar:', error);
    } finally {
      this.uploadingAvatar = false;
    }
  }

  async signOut() {
    try {
      await this.supabaseService.signOut();
      this.router.navigate(['/login']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error signing out';
      console.error('Error signing out:', error);
    }
  }
} 