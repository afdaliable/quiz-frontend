import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PremiumService } from '../services/premium.service';
import { ThemeService } from '../services/theme.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-phone-number-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './phone-number-modal.component.html',
  styleUrl: './phone-number-modal.component.css'
})
export class PhoneNumberModalComponent implements OnInit {
  @Input() show = false;
  @Input() planId: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() phoneUpdated = new EventEmitter<boolean>();
  
  phoneForm: FormGroup;
  isSubmitting = false;
  error = '';
  isDarkMode = false;
  
  constructor(
    private fb: FormBuilder,
    private premiumService: PremiumService,
    private themeService: ThemeService
  ) {
    this.phoneForm = this.fb.group({
      phoneNumber: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(15),
        Validators.pattern('^[0-9]+$')
      ]]
    });
  }

  ngOnInit(): void {
    // Subscribe to theme service
    this.themeService.darkMode$.subscribe(isDarkMode => {
      this.isDarkMode = isDarkMode;
    });
  }
  
  onSubmit(): void {
    if (this.phoneForm.invalid) {
      this.error = 'Please enter a valid phone number';
      return;
    }
    
    this.isSubmitting = true;
    this.error = '';
    
    const phoneNumber = this.phoneForm.get('phoneNumber')?.value;
    console.log('Submitting phone number:', phoneNumber);
    
    this.premiumService.updatePhoneNumber(phoneNumber).subscribe({
      next: (response) => {
        console.log('Phone update successful:', response);
        this.isSubmitting = false;
        if (response.success) {
          console.log('Phone updated successfully, emitting event');
          this.phoneUpdated.emit(true);
          this.close.emit();
        } else {
          this.error = response.message || 'Failed to update phone number';
          console.error('Phone update failed with message:', this.error);
        }
      },
      error: (err) => {
        console.error('Phone update error:', err);
        this.isSubmitting = false;
        this.error = err.message || 'Failed to update phone number. Please try again.';
      }
    });
  }
  
  onCancel(): void {
    this.close.emit();
  }
}
