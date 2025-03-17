import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { QuestionService } from '../services/question.service';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Question } from '../services/question.service';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { PaketSoal } from '../models/paket-soal.model';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.scss'],
})
export class QuestionComponent implements OnInit {
  public name: string = '';
  public questionList: any = [];
  public currentQuestion: number = 0;
  public points: number = 0;
  counter = 60;
  correctAnswer: number = 0;
  incorrectAnswer: number = 0;
  interval$: any;
  progress: string = '0';
  isQuizCompleted: boolean = false;
  showAnswerKey: boolean = false;
  dummyAnswerKey: string = 'A';
  dummyExplanation: string =
    'Ini adalah penjelasan dummy untuk kunci jawaban. Dalam implementasi sebenarnya, penjelasan ini akan berubah sesuai dengan pertanyaan yang sedang ditampilkan.';
  totalTime: number = 0;
  remainingTime: number = 0;
  isPaused: boolean = false;
  answeredQuestions: boolean[] = [];
  showCorrectAnswer: boolean = false;
  markedQuestions: boolean[] = [];
  selectedAnswers: number[] = [];
  showScore: boolean = false;

  selectedPaket: PaketSoal | null = null;
  currentUser: any;
  isDarkMode: boolean = false;

  constructor(
    private questionService: QuestionService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
    this.name = localStorage.getItem('name')!;
    this.totalTime = parseInt(localStorage.getItem('durasi')!) * 60;
    this.remainingTime = this.totalTime;
    this.selectedAnswers = new Array(this.questionList.length).fill(null);

    try {
      const selectedPaketStr = localStorage.getItem('selectedPaket');
      if (selectedPaketStr) {
        try {
          const selectedPaket = JSON.parse(selectedPaketStr);
          
          // Validate the selected paket
          const hasValidId = selectedPaket.id || selectedPaket.id_nama_paket_soal;
          if (!hasValidId || !selectedPaket.nama_paket_soal || !selectedPaket.kategori_soal) {
            console.error('Invalid selected paket:', selectedPaket);
            alert('Error: Invalid quiz data. Please go back and select a quiz again.');
            this.router.navigate(['/home']);
            return;
          }
          
          this.selectedPaket = selectedPaket;
          console.log('Selected paket:', this.selectedPaket);
          
          this.getAllQuestions(
            this.selectedPaket!.kategori_soal,
            this.selectedPaket!.nama_paket_soal
          );
          this.startTimer();
          this.themeService.darkMode$.subscribe(
            isDark => this.isDarkMode = isDark
          );
        } catch (error) {
          console.error('Error parsing selectedPaket:', error);
          alert('Error loading quiz data. Please select a quiz again.');
          this.router.navigate(['/home']);
        }
      } else {
        console.error('No selectedPaket found in localStorage');
        alert('Please select a quiz first.');
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Error in ngOnInit:', error);
      alert('An unexpected error occurred. Please try again.');
      this.router.navigate(['/home']);
    }
  }

  getAllQuestions(kategori: string, paketSoal: string) {
    this.questionService
      .getQuestions(kategori, paketSoal)
      .pipe(
        tap((res: Question[]) => {
          this.questionList = res;
          this.answeredQuestions = new Array(this.questionList.length).fill(
            false
          );
          this.selectedAnswers = new Array(this.questionList.length).fill(
            undefined
          );
        })
      )
      .subscribe();
    this.startTimer();
  }

  nextQuestion() {
    if (this.currentQuestion < this.questionList.length - 1) {
      this.currentQuestion++;
      this.getProgressPercent();
    } else {
      this.isQuizCompleted = true;
      this.stopTimer();
    }
  }

  prevQuestion() {
    this.currentQuestion--;
  }

  answer(currentQno: number, option: number) {
    this.selectedAnswers[currentQno] = option;
    this.answeredQuestions[currentQno] = true;
    this.saveUserAnswers();
  }

  calculateScore() {
    this.correctAnswer = 0;
    this.incorrectAnswer = 0;
    this.questionList.forEach((question: any, index: number) => {
      if (this.selectedAnswers[index] !== undefined) {
        if (question.options[this.selectedAnswers[index]].correct) {
          this.correctAnswer++;
        } else {
          this.incorrectAnswer++;
        }
      }
    });

    // Perhitungan skor baru
    this.points = Math.round(
      (this.correctAnswer / this.questionList.length) * 100
    );
  }

  startCounter() {
    this.interval$ = interval(1000).subscribe(() => {
      this.counter--;
      if (this.counter === 0) {
        this.currentQuestion++;
        this.counter = 60;
        this.points -= 10;
      }
    });
    setTimeout(() => {
      this.interval$.unsubscribe();
    }, 600000);
  }

  stopCounter() {
    this.interval$.unsubscribe();
    this.counter = 0;
  }

  getAnsweredQuestionsCount(): number {
    return this.answeredQuestions.filter((q) => q).length;
  }

  getUnansweredQuestionsCount(): number {
    return this.questionList.length - this.getAnsweredQuestionsCount();
  }

  resetCounter() {
    this.stopCounter();
    this.counter = 60;
    this.startCounter();
  }

  resetQuiz() {
    this.resetCounter();
    const selectedPaket = JSON.parse(localStorage.getItem('selectedPaket')!);
    if (selectedPaket) {
      this.getAllQuestions(
        selectedPaket.kategori_soal,
        selectedPaket.nama_paket_soal
      );
    } else {
      console.error('No selected paket found');
    }
    this.points = 0;
    this.counter = 60;
    this.currentQuestion = 0;
    this.progress = '0';
    this.isQuizCompleted = false;
    this.answeredQuestions = new Array(this.questionList.length).fill(false);
  }

  getProgressPercent() {
    this.progress = ((this.currentQuestion / this.questionList.length) * 100)
      .toFixed(0)
      .toString();

    return this.progress;
  }

  toggleAnswerKey() {
    this.showAnswerKey = !this.showAnswerKey;
  }

  goToQuestion(index: number) {
    this.currentQuestion = index;
    this.getProgressPercent();
    this.showAnswerKey = false;
    this.showCorrectAnswer = false;
    // Hapus pemanggilan startTimer() di sini
  }

  startTimer() {
    if (!this.interval$) {
      this.interval$ = interval(1000).subscribe(() => {
        if (this.remainingTime > 0) {
          this.remainingTime--;
        } else {
          this.stopTimer();
          this.isQuizCompleted = true;
        }
      });
    }
  }

  stopTimer() {
    if (this.interval$) {
      this.interval$.unsubscribe();
    }
  }

  pauseTimer() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.interval$.unsubscribe();
    } else {
      this.startTimer();
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  toggleMarkQuestion() {
    this.markedQuestions[this.currentQuestion] =
      !this.markedQuestions[this.currentQuestion];
  }

  endQuiz() {
    console.log('Ending quiz...');
    this.isQuizCompleted = true;
    this.stopCounter();
    this.calculateScore();
    localStorage.setItem('totalQuestions', this.questionList.length.toString());
    localStorage.setItem(
      'answeredQuestions',
      this.getAnsweredQuestionsCount().toString()
    );
    localStorage.setItem('points', this.points.toString());
    localStorage.setItem('correctAnswers', this.correctAnswer.toString());
    localStorage.setItem(
      'incorrectAnswers',
      (this.questionList.length - this.correctAnswer).toString()
    );
    console.log('Navigating to result page...');
    this.saveUserAnswers();
    this.router.navigate(['/result']);
  }

  reviewQuiz() {
    // Implementasi untuk menampilkan review soal
    // Ini bisa berupa navigasi ke halaman baru atau menampilkan modal
    console.log('Review quiz');
  }
  saveUserAnswers() {
    localStorage.setItem(
      'selectedAnswers',
      JSON.stringify(this.selectedAnswers)
    );
  }

  confirmEndQuiz() {
    console.log('Confirming end quiz...');
    const unansweredQuestions = this.answeredQuestions.filter(
      (answered) => !answered
    ).length;
    if (unansweredQuestions > 0) {
      if (
        confirm(
          `Anda masih memiliki ${unansweredQuestions} soal yang belum dijawab. Apakah Anda yakin ingin mengakhiri ujian?`
        )
      ) {
        this.endQuiz();
      }
    } else {
      if (confirm('Apakah Anda yakin ingin mengakhiri ujian?')) {
        this.endQuiz();
      }
    }
  }

  getQuestionButtonClass(index: number): string {
    if (this.isDarkMode) {
      if (this.currentQuestion === index) {
        return 'bg-blue-600 text-white';
      } else if (this.answeredQuestions[index]) {
        return 'bg-green-600 text-white';
      } else if (this.markedQuestions[index]) {
        return 'bg-yellow-500 text-white';
      } else {
        return 'bg-gray-700 text-gray-200';
      }
    } else {
      if (this.currentQuestion === index) {
        return 'bg-blue-500 text-white';
      } else if (this.answeredQuestions[index]) {
        return 'bg-green-500 text-white';
      } else if (this.markedQuestions[index]) {
        return 'bg-yellow-500 text-white';
      } else {
        return 'bg-white text-gray-700 border border-gray-300';
      }
    }
  }
}
