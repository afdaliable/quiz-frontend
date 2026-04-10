import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LevelInfo } from '../models/xp-system.model';

@Component({
  selector: 'app-level-up-modal',
  templateUrl: './level-up-modal.component.html',
  styleUrls: ['./level-up-modal.component.scss']
})
export class LevelUpModalComponent implements OnInit {
  @Input() oldLevel!: LevelInfo;
  @Input() newLevel!: LevelInfo;
  @Input() isDarkMode: boolean = false;
  @Output() closed = new EventEmitter<void>();

  isVisible = true;
  confettiPieces = Array.from({ length: 20 }, (_, i) => i + 1);

  ngOnInit(): void {
    setTimeout(() => this.close(), 10_000);
  }

  close(): void {
    this.isVisible = false;
    this.closed.emit();
  }
}
