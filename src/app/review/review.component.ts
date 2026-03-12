import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { QuestionService } from '../services/question.service';
import { ThemeService } from '../services/theme.service';

interface Question {
  id: number;
  questionText: string;
  question_type: string;
  options: {
    text: string;
    correct: boolean;
  }[];
  solution: string;
}

interface PaketSoal {
  id_nama_paket_soal: number;
  nama_paket_soal: string;
  id_kategori_soal: number;
  kategori_soal: string;
  jumlah_soal: number;
}

@Component({
  selector: 'app-review',
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss']
})
export class ReviewComponent implements OnInit {
  public name: string = '';
  public questionList: Question[] = [];
  public currentQuestion: number = 0;
  public selectedAnswers: number[] = [];
  public selectedPaket: PaketSoal | null = null;
  public showExplanation: boolean = true;
  currentUser: any;
  points: number = 0;
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;
  isDarkMode: boolean = false;

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.loadReviewData();
    this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
  }

  loadReviewData(): void {
    // Load user data
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }

    // Load selected paket
    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
      this.loadQuestions();
    }

    // Load answers
    const answersData = localStorage.getItem('selectedAnswers');
    if (answersData) {
      this.selectedAnswers = JSON.parse(answersData);
    }
  }

  loadQuestions(): void {
    if (this.selectedPaket) {
      this.questionService
        .getQuestions(
          this.selectedPaket.kategori_soal,
          this.selectedPaket.nama_paket_soal
        )
        .subscribe({
          next: (questions: Question[]) => {
            this.questionList = questions;
            console.log('Questions loaded:', questions);
          },
          error: (error) => {
            console.error('Error loading questions:', error);
          }
        });
    }
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questionList.length) {
      this.currentQuestion = index;
      this.showExplanation = true;
    }
  }

  prevQuestion(): void {
    if (this.currentQuestion > 0) {
      this.currentQuestion--;
      this.showExplanation = true;
    }
  }

  nextQuestion(): void {
    if (this.currentQuestion < this.questionList.length - 1) {
      this.currentQuestion++;
      this.showExplanation = true;
    }
  }

  toggleExplanation(): void {
    this.showExplanation = !this.showExplanation;
  }

  isUserAnswerCorrect(questionIndex: number): boolean {
    if (!this.questionList[questionIndex]) return false;
    const selectedAnswer = this.selectedAnswers[questionIndex];
    if (selectedAnswer === undefined) return false;
    return this.questionList[questionIndex].options[selectedAnswer]?.correct || false;
  }

  getUserAnswer(questionIndex: number): string {
    const userAnswer = this.selectedAnswers[questionIndex];
    return userAnswer !== undefined
      ? ['A', 'B', 'C', 'D', 'E'][userAnswer]
      : 'Tidak dijawab';
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }
}
