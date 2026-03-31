import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { PomodoroService } from '../services/pomodoro.service';
import { PomodoroSettings } from '../models/pomodoro.model';

@Component({
  selector: 'app-pomodoro-break-modal',
  templateUrl: './pomodoro-break-modal.component.html',
})
export class PomodoroBreakModalComponent implements OnInit, OnDestroy {
  @Input() isDarkMode = false;

  showBreakModal = false;
  breakIsLong = false;
  breakModalCount = 0;
  breakRunning = false;

  timeLeft = 0;
  totalPhaseTime = 0;
  settings!: PomodoroSettings;

  private subs: Subscription[] = [];

  constructor(private pomodoroService: PomodoroService) {}

  ngOnInit(): void {
    this.settings = this.pomodoroService.settings;

    this.subs.push(
      this.pomodoroService.settings$.subscribe(s => { this.settings = s; }),
      this.pomodoroService.timeLeft$.subscribe(t => { this.timeLeft = t; }),
      this.pomodoroService.totalPhaseTime$.subscribe(t => { this.totalPhaseTime = t; }),

      this.pomodoroService.focusComplete$.subscribe(({ isLong, count }) => {
        this.breakIsLong = isLong;
        this.breakModalCount = count;
        this.breakRunning = false;
        this.showBreakModal = true;
      }),

      this.pomodoroService.breakComplete$.subscribe(() => {
        this.showBreakModal = false;
        this.breakRunning = false;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get progressPercent(): number {
    if (this.totalPhaseTime === 0) return 0;
    return ((this.totalPhaseTime - this.timeLeft) / this.totalPhaseTime) * 100;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onStartBreak(): void {
    this.breakRunning = true;
    this.pomodoroService.startBreak();
  }

  onSkipBreak(): void {
    this.showBreakModal = false;
    this.breakRunning = false;
    this.pomodoroService.startNextFocus();
  }
}
