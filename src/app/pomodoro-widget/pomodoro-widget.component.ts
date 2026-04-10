import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  PomodoroService,
  PomodoroPhase,
  PomodoroSettings,
} from '../services/pomodoro.service';

@Component({
  selector: 'app-pomodoro-widget',
  templateUrl: './pomodoro-widget.component.html',
  styleUrls: ['./pomodoro-widget.component.scss'],
})
export class PomodoroWidgetComponent implements OnInit, OnDestroy {
  @Input() isDarkMode = false;
  @Input() quizMode: 'exam' | 'study' | 'review' = 'exam';

  phase: PomodoroPhase = 'idle';
  timeLeft = 0;
  totalPhaseTime = 0;
  pomodoroCount = 0;
  settings!: PomodoroSettings;

  isMinimized = false;
  showStopConfirm = false;

  // Setup modal (floating button)
  showSetupModal = false;
  selectedPreset: 'classic' | 'short' | 'long' | 'custom' = 'classic';
  customFocus = 25;
  customBreak = 5;

  private subs: Subscription[] = [];

  constructor(readonly pomodoroService: PomodoroService) {}

  ngOnInit(): void {
    this.settings = this.pomodoroService.settings;

    this.subs.push(
      this.pomodoroService.phase$.subscribe(p => { this.phase = p; }),
      this.pomodoroService.timeLeft$.subscribe(t => { this.timeLeft = t; }),
      this.pomodoroService.totalPhaseTime$.subscribe(t => { this.totalPhaseTime = t; }),
      this.pomodoroService.pomodoroCount$.subscribe(c => { this.pomodoroCount = c; }),
      this.pomodoroService.settings$.subscribe(s => { this.settings = s; }),

    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  get progressPercent(): number {
    if (this.totalPhaseTime === 0) return 0;
    return ((this.totalPhaseTime - this.timeLeft) / this.totalPhaseTime) * 100;
  }

  get phaseLabel(): string {
    switch (this.phase) {
      case 'focus':       return 'Fase fokus · Kerjakan soal!';
      case 'short-break': return 'Istirahat singkat · Jauh dari layar!';
      case 'long-break':  return 'Istirahat panjang · Istirahatlah!';
      default:            return '';
    }
  }

  get phaseIcon(): string {
    return (this.phase === 'focus') ? '🍅' : '☕';
  }

  get currentPomodoroNum(): number {
    // During focus: count + 1; during break: count (already incremented)
    return this.phase === 'focus' ? this.pomodoroCount + 1 : this.pomodoroCount;
  }

  get isActive(): boolean {
    return this.pomodoroService.isActive;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  readonly presets: Array<{ k: 'classic' | 'short' | 'long' | 'custom'; l: string; desc: string }> = [
    { k: 'classic', l: 'Klasik',  desc: '25 / 5 mnt'  },
    { k: 'short',   l: 'Singkat', desc: '15 / 3 mnt'  },
    { k: 'long',    l: 'Panjang', desc: '50 / 10 mnt' },
    { k: 'custom',  l: 'Custom',  desc: 'Bebas atur'  },
  ];

  openSetup(): void {
    this.selectedPreset = 'classic';
    this.customFocus = 25;
    this.customBreak = 5;
    this.showSetupModal = true;
  }

  closeSetup(): void {
    this.showSetupModal = false;
  }

  applyPreset(preset: 'classic' | 'short' | 'long' | 'custom'): void {
    this.selectedPreset = preset;
    switch (preset) {
      case 'classic': this.customFocus = 25; this.customBreak = 5;  break;
      case 'short':   this.customFocus = 15; this.customBreak = 3;  break;
      case 'long':    this.customFocus = 50; this.customBreak = 10; break;
    }
  }

  confirmStartPomodoro(): void {
    this.pomodoroService.updateSettings({
      enabled: true,
      focusDuration: this.customFocus,
      shortBreakDuration: this.customBreak,
    });
    this.showSetupModal = false;
    this.pomodoroService.start();
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
  }

  requestStop(): void {
    this.showStopConfirm = true;
  }

  cancelStop(): void {
    this.showStopConfirm = false;
  }

  confirmStop(): void {
    this.pomodoroService.stop();
    this.showStopConfirm = false;
  }

  toggleSound(): void {
    this.pomodoroService.updateSettings({ soundEnabled: !this.settings.soundEnabled });
  }
}
