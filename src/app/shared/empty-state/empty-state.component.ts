import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateIllustration = 'history' | 'search' | 'bookmark' | 'leaderboard' | 'notification';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  @Input() title!: string;
  @Input() body?: string;
  @Input() ctaLabel?: string;
  @Input() linkLabel?: string;
  @Input() isDarkMode: boolean = false;
  @Input() illustration: EmptyStateIllustration = 'history';
  @Output() ctaClick = new EventEmitter<void>();
  @Output() linkClick = new EventEmitter<void>();
}
