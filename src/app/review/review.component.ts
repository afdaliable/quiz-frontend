import { Component, OnInit } from '@angular/core';
import { QuestionService } from '../services/question.service';
import { Router } from '@angular/router';
import { Question } from '../services/question.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-review',
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.css']
})
export class ReviewComponent implements OnInit {
  public name: string = '';
  public questionList: Question[] = [];
  public currentQuestion: number = 0;
  public selectedAnswers: number[] = [];
  public selectedPaket: any = null;
  public showExplanation: boolean = false;
  currentUser: any;
  points: number = 0;
  correctAnswers: number = 0;
  incorrectAnswers: number = 0;

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
    this.name = localStorage.getItem('name')!;
    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);
      this.getQuestions();
    }
    const savedAnswers = localStorage.getItem('selectedAnswers');
    if (savedAnswers) {
      this.selectedAnswers = JSON.parse(savedAnswers);
      console.log('Loaded user answers:', this.selectedAnswers);
    } else {
      console.log('No saved answers found');
    }
  }

  getQuestions() {
    this.questionService
      .getQuestions(
        this.selectedPaket.kategori_soal,
        this.selectedPaket.nama_paket_soal
      )
      .subscribe((questions: Question[]) => {
        this.questionList = questions;
      });
  }

  nextQuestion() {
    if (this.currentQuestion < this.questionList.length - 1) {
      this.currentQuestion++;
      this.showExplanation = false;
    }
  }

  prevQuestion() {
    if (this.currentQuestion > 0) {
      this.currentQuestion--;
      this.showExplanation = false;
    }
  }

  goToQuestion(index: number) {
    this.currentQuestion = index;
    this.showExplanation = false;
  }

  toggleExplanation() {
    this.showExplanation = !this.showExplanation;
  }

  getUserAnswer(questionIndex: number): string {
    const userAnswer = this.selectedAnswers[questionIndex];
    return userAnswer !== undefined
      ? ['A', 'B', 'C', 'D', 'E'][userAnswer]
      : 'Tidak dijawab';
  }
  goToHome() {
    this.router.navigate(['/']);
  }

  isUserAnswerCorrect(questionIndex: number): boolean {
    const userAnswer = this.selectedAnswers[questionIndex];
    return (
      this.questionList[questionIndex].options[userAnswer]?.correct || false
    );
  }
}
