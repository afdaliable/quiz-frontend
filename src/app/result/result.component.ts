import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';

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

  motivationMessage: string = '';
  wrongQuestions: number[] = [];
  celebrationActive: boolean = false;

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
}
