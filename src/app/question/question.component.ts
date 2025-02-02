import { Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { QuestionService } from '../services/question.service';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Question } from '../services/question.service';

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

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

  constructor(
    private questionService: QuestionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.name = localStorage.getItem('name')!;
    this.totalTime = parseInt(localStorage.getItem('durasi')!) * 60;
    this.remainingTime = this.totalTime;
    this.selectedAnswers = new Array(this.questionList.length).fill(null);

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
    }
    if (this.selectedPaket) {
      this.getAllQuestions(
        this.selectedPaket.kategori_soal,
        this.selectedPaket.nama_paket_soal
      );
    } else {
      console.error('No selected paket found');
    }
    this.startTimer();
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
}
