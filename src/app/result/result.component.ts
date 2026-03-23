import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { PomodoroService, PomodoroPhaseRecord } from '../services/pomodoro.service';
import html2canvas from 'html2canvas';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent implements OnInit {
  name: string = '';
  selectedPaket: any = null;
  totalQuestions: number = 0;
  answeredQuestions: number = 0;
  unansweredQuestions: number = 0;
  showScore: boolean = false;
  points: number = 0;
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  currentUser: any;
  isDarkMode: boolean = false;
  quizMode: 'exam' | 'study' | 'review' = 'exam';
  @ViewChild('resultCard', { static: false }) resultCard!: ElementRef;

  motivationMessage: string = '';
  wrongQuestions: number[] = [];
  celebrationActive: boolean = false;

  // Pomodoro stats
  pomodoroRecords: PomodoroPhaseRecord[] = [];

  constructor(
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.loadResultData();
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  loadResultData(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }

    this.quizMode = (localStorage.getItem('quizMode') as 'exam' | 'study' | 'review') || 'exam';

    this.totalQuestions = parseInt(localStorage.getItem('totalQuestions') || '0');
    this.answeredQuestions = parseInt(localStorage.getItem('answeredQuestions') || '0');
    this.unansweredQuestions = this.totalQuestions - this.answeredQuestions;
    this.points = parseInt(localStorage.getItem('points') || '0');
    this.correctAnswers = parseInt(localStorage.getItem('correctAnswers') || '0');
    this.incorrectAnswers = parseInt(localStorage.getItem('incorrectAnswers') || '0');

    const wrongData = localStorage.getItem('wrongQuestions');
    if (wrongData) {
      this.wrongQuestions = JSON.parse(wrongData);
    }

    this.motivationMessage = this.getMotivationMessage();

    if (this.points >= 80) {
      this.celebrationActive = true;
      setTimeout(() => (this.celebrationActive = false), 5000);
    }

    // Load Pomodoro session stats
    this.pomodoroRecords = PomodoroService.loadSessionStats();
  }

  get pomodoroBestRecord(): PomodoroPhaseRecord | null {
    if (!this.pomodoroRecords.length) return null;
    return this.pomodoroRecords.reduce((best, r) =>
      r.questionsAnswered > best.questionsAnswered ? r : best
    );
  }

  get pomodoroTotalFocusMinutes(): number {
    return this.pomodoroRecords.reduce((sum, r) => sum + Math.floor(r.durationSeconds / 60), 0);
  }

  get pomodoroQuestionsPerMinute(): number {
    if (!this.pomodoroTotalFocusMinutes) return 0;
    const total = this.pomodoroRecords.reduce((sum, r) => sum + r.questionsAnswered, 0);
    return Math.round((total / this.pomodoroTotalFocusMinutes) * 10) / 10;
  }

  pomodoroBarWidth(record: PomodoroPhaseRecord): number {
    const max = this.pomodoroBestRecord?.questionsAnswered || 1;
    return Math.round((record.questionsAnswered / max) * 100);
  }

  getMotivationMessage(): string {
    if (this.points >= 80) return 'Luar biasa! Kamu menguasai materi ini! 🎉';
    if (this.points >= 50) return 'Hampir! Sedikit lagi kamu pasti bisa 🎯';
    return 'Jangan menyerah! Review jawaban dan coba lagi 💪';
  }

  get wrongQuestionsPreview(): number[] {
    return this.wrongQuestions.slice(0, 10);
  }

  get remainingWrongCount(): number {
    return Math.max(0, this.wrongQuestions.length - 10);
  }

  toggleScore(): void {
    this.showScore = !this.showScore;
  }

  reviewAnswers(): void {
    this.router.navigate(['/review']);
  }

  retryQuiz(): void {
    this.router.navigate(['/welcome']);
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  async shareResult(): Promise<void> {
    try {
      const canvas = await html2canvas(this.resultCard.nativeElement, {
        backgroundColor: null,
        scale: 2
      });

      const imageUrl = canvas.toDataURL('image/png');

      // Web Share API (mobile)
      if (navigator.share) {
        const blob = await (await fetch(imageUrl)).blob();
        try {
          await navigator.share({
            files: [new File([blob], 'hasil-kuis.png', { type: 'image/png' })],
            title: 'Hasil Kuis Canducation'
          });
        } catch (shareError) {
          // Fallback to download if share is not supported or cancelled
          console.log('Share failed or cancelled, falling back to download:', shareError);
          const link = document.createElement('a');
          link.download = 'hasil-kuis.png';
          link.href = imageUrl;
          link.click();
        }
      } else {
        // Fallback: download gambar
        const link = document.createElement('a');
        link.download = 'hasil-kuis.png';
        link.href = imageUrl;
        link.click();
      }
    } catch (error) {
      console.error('Gagal membagikan hasil:', error);
      alert('Gagal membagikan hasil. Silakan coba lagi.');
    }
  }
}
