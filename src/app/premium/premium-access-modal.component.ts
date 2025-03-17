import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PremiumPlan } from '../services/premium.service';

@Component({
  selector: 'app-premium-access-modal',
  templateUrl: './premium-access-modal.component.html',
  styleUrls: ['./premium-access-modal.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class PremiumAccessModalComponent implements OnInit {
  @Input() isDarkMode: boolean = false;
  @Input() quizName: string = '';
  @Input() availablePlans: PremiumPlan[] = [];
  @Output() close = new EventEmitter<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    document.body.style.overflow = '';
    this.close.emit();
  }

  goToPremiumPlans(): void {
    this.closeModal();
    this.router.navigate(['/premium/plans']);
  }

  // Close modal when clicking outside the modal content
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
} 