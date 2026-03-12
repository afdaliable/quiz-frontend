import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { interval } from 'rxjs';
import { QuestionService } from '../services/question.service';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Question } from '../services/question.service';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { PaketSoal } from '../models/paket-soal.model';
import { QuizSessionService, QuizSession } from '../services/quiz-session.service';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css'],
})
export class QuestionComponent implements OnInit, OnDestroy {
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
  selectedAnswers: (number | null)[] = [];
  showScore: boolean = false;

  selectedPaket: PaketSoal | null = null;
  currentUser: any;
  isDarkMode: boolean = false;
  isReviewMode: boolean = false;
  showExplanation: boolean = false;
  isAnswerChecked: boolean = false;
  currentAnswerIsCorrect: boolean = false;
  correctAnswerIndex: number | null = null;
  answerExplanation: string = '';

  // End quiz confirmation modal
  showEndModal: boolean = false;

  // Timer visual warning
  showToast: boolean = false;
  toastMessage: string = '';
  private toast60Shown: boolean = false;
  private toastTimer: any;

  // Quiz session management properties
  currentSession: QuizSession | null = null;
  autoSaveInterval: any;
  sessionInitialized: boolean = false;

  // Keyboard shortcut hint
  showKeyboardHint: boolean = false;
  private keyboardHintTimer: any;

  constructor(
    private questionService: QuestionService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private quizSessionService: QuizSessionService
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
    this.name = localStorage.getItem('name')!;
    this.totalTime = parseInt(localStorage.getItem('durasi')!) * 60;
    this.remainingTime = this.totalTime;
    this.isReviewMode = localStorage.getItem('isReviewMode') === 'true';

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
          
          // Initialize quiz session first, then load questions
          this.initializeQuizSession();
          
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

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Disable shortcuts when user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    // Disable if modal is open
    if (this.showEndModal) return;

    switch (event.key) {
      case '1': case 'a': case 'A': this.answer(this.currentQuestion, 0); break;
      case '2': case 'b': case 'B': this.answer(this.currentQuestion, 1); break;
      case '3': case 'c': case 'C': this.answer(this.currentQuestion, 2); break;
      case '4': case 'd': case 'D': this.answer(this.currentQuestion, 3); break;
      case '5': case 'e': case 'E': this.answer(this.currentQuestion, 4); break;
      case 'ArrowRight':
        if (this.currentQuestion < this.questionList.length - 1) this.nextQuestion();
        break;
      case 'ArrowLeft':
        if (this.currentQuestion > 0) this.prevQuestion();
        break;
      case 't': case 'T': this.toggleMarkQuestion(); break;
    }
  }

  ngOnDestroy(): void {
    // Clean up intervals
    if (this.interval$) {
      this.interval$.unsubscribe();
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    if (this.keyboardHintTimer) {
      clearTimeout(this.keyboardHintTimer);
    }
    
    // Save final progress before leaving
    if (this.currentSession && !this.isQuizCompleted) {
      this.saveProgressToSession();
    }
  }

  /**
   * Initialize or resume quiz session
   */
  private async initializeQuizSession(): Promise<void> {
    if (!this.selectedPaket || this.sessionInitialized) {
      return;
    }

    try {
      // Initialize session with the quiz session service
      this.currentSession = await this.quizSessionService.initializeQuizSession(
        this.selectedPaket, 
        this.totalTime
      );
      
      if (this.currentSession) {
        this.sessionInitialized = true;
        console.log('Quiz session initialized:', this.currentSession);

        // Load session data if resuming
        this.loadSessionData();

        // Load questions
        this.getAllQuestions(
          this.selectedPaket.kategori_soal,
          this.selectedPaket.nama_paket_soal
        );

        // Setup auto-save
        this.setupAutoSave();
      } else {
        // Session service returned null/undefined — fallback to direct load
        console.warn('Quiz session returned null, loading questions directly');
        this.getAllQuestions(
          this.selectedPaket.kategori_soal,
          this.selectedPaket.nama_paket_soal
        );
      }
    } catch (error) {
      console.error('Error initializing quiz session:', error);
      // Fallback to original behavior
      this.getAllQuestions(
        this.selectedPaket.kategori_soal,
        this.selectedPaket.nama_paket_soal
      );
    }
  }

  /**
   * Load session data if resuming
   */
  private loadSessionData(): void {
    if (!this.currentSession) return;

    // Load progress from session
    this.currentQuestion = this.currentSession.current_question || 0;
    this.selectedAnswers = this.currentSession.answers || [];
    this.markedQuestions = this.currentSession.marked_questions || [];
    
    if (this.currentSession.time_remaining !== null) {
      this.remainingTime = this.currentSession.time_remaining;
    } else {
      this.remainingTime = this.totalTime;
    }
    
    console.log('Loaded session data:', {
      currentQuestion: this.currentQuestion,
      answersCount: this.selectedAnswers.length,
      timeRemaining: this.remainingTime
    });
  }

  /**
   * Setup auto-save interval
   */
  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveProgress();
    }, 30000);
  }

  /**
   * Auto-save progress
   */
  private autoSaveProgress(): void {
    if (!this.currentSession || this.isQuizCompleted) {
      return;
    }

    this.quizSessionService.autoSaveProgress(this.currentSession.id, {
      current_question: this.currentQuestion,
      answers: this.selectedAnswers,
      marked_questions: this.markedQuestions,
      time_remaining: this.remainingTime
    });
  }

  /**
   * Save progress immediately (used on answer selection)
   */
  private saveProgressToSession(): void {
    if (!this.currentSession || this.isQuizCompleted) {
      return;
    }

    this.quizSessionService.saveQuizProgress(this.currentSession.id, {
      current_question: this.currentQuestion,
      answers: this.selectedAnswers,
      marked_questions: this.markedQuestions,
      time_remaining: this.remainingTime
    }).subscribe({
      next: (session) => {
        console.log('Progress saved to session:', session.updated_at);
      },
      error: (error) => {
        console.error('Error saving progress:', error);
      }
    });
  }

  getAllQuestions(kategori: string, paketSoal: string) {
    this.questionService
      .getQuestions(kategori, paketSoal)
      .pipe(
        tap((res: Question[]) => {
          this.questionList = res;
          
          // Initialize arrays only if not resuming from session
          if (!this.currentSession || this.selectedAnswers.length === 0) {
            this.answeredQuestions = new Array(this.questionList.length).fill(false);
            this.selectedAnswers = new Array(this.questionList.length).fill(null);
            this.markedQuestions = new Array(this.questionList.length).fill(false);
          } else {
            // Ensure arrays are properly sized when resuming
            while (this.selectedAnswers.length < this.questionList.length) {
              this.selectedAnswers.push(null);
            }
            while (this.answeredQuestions.length < this.questionList.length) {
              this.answeredQuestions.push(false);
            }
            while (this.markedQuestions.length < this.questionList.length) {
              this.markedQuestions.push(false);
            }
            
            // Update answeredQuestions based on selectedAnswers
            this.selectedAnswers.forEach((answer, index) => {
              this.answeredQuestions[index] = answer !== null;
            });
          }
        })
      )
      .subscribe({
        next: () => {
          this.startTimer();
          this.getProgressPercent();
          // Show keyboard hint once at quiz start
          this.showKeyboardHint = true;
          this.keyboardHintTimer = setTimeout(() => {
            this.showKeyboardHint = false;
          }, 5000);
        },
        error: (error) => {
          console.error('Error loading questions:', error);
        }
      });
  }

  nextQuestion() {
    if (this.currentQuestion < this.questionList.length - 1) {
      this.currentQuestion++;
      this.getProgressPercent();
      this.resetAnswerCheck();
    } else {
      this.isQuizCompleted = true;
      this.stopTimer();
    }
  }

  prevQuestion() {
    this.currentQuestion--;
    this.resetAnswerCheck();
  }

  answer(currentQno: number, option: number) {
    this.selectedAnswers[currentQno] = option;
    this.answeredQuestions[currentQno] = true;
    
    // Save to localStorage (legacy support)
    this.saveUserAnswers();
    
    // Save to session (new feature)
    if (this.currentSession) {
      this.saveProgressToSession();
    }
    
    if (this.isReviewMode) {
      this.isAnswerChecked = false;
      this.showExplanation = false;
    }
  }

  calculateScore() {
    this.correctAnswer = 0;
    this.incorrectAnswer = 0;
    const wrongNumbers: number[] = [];

    this.questionList.forEach((question: any, index: number) => {
      const selectedAnswer = this.selectedAnswers[index];
      if (selectedAnswer !== null && selectedAnswer !== undefined) {
        if (question.options[selectedAnswer].correct) {
          this.correctAnswer++;
        } else {
          this.incorrectAnswer++;
          wrongNumbers.push(index + 1);
        }
      }
    });

    // Perhitungan skor baru
    this.points = Math.round(
      (this.correctAnswer / this.questionList.length) * 100
    );

    localStorage.setItem('wrongQuestions', JSON.stringify(wrongNumbers));
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
    this.resetAnswerCheck();
  }

  startTimer() {
    if (!this.interval$) {
      this.interval$ = interval(1000).subscribe(() => {
        if (this.remainingTime > 0) {
          this.remainingTime--;
          if (this.remainingTime === 60 && !this.toast60Shown) {
            this.toast60Shown = true;
            this.triggerToast('⚠️ Waktu tersisa 1 menit!');
          }
        } else {
          this.stopTimer();
          this.isQuizCompleted = true;
        }
      });
    }
  }

  triggerToast(message: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastMessage = message;
    this.showToast = true;
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  dismissToast(): void {
    this.showToast = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
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
    
    // Save to session
    if (this.currentSession) {
      this.saveProgressToSession();
    }
  }

  endQuiz() {
    console.log('Ending quiz...');
    this.isQuizCompleted = true;
    this.stopCounter();
    this.calculateScore();
    
    // Save to localStorage (legacy support)
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
    this.saveUserAnswers();
    
    // Complete session (new feature)
    if (this.currentSession) {
      this.quizSessionService.completeQuizSession(this.currentSession.id, {
        answers: this.selectedAnswers,
        time_remaining: this.remainingTime
      }).subscribe({
        next: (completedSession) => {
          console.log('Quiz session completed:', completedSession);
          localStorage.setItem('completedSessionId', completedSession.id);
          console.log('Navigating to result page...');
          this.router.navigate(['/result']);
        },
        error: (error) => {
          console.error('Error completing session:', error);
          // Still navigate to result page even if session completion fails
          console.log('Navigating to result page...');
          this.router.navigate(['/result']);
        }
      });
    } else {
      // Original behavior if no session
      console.log('Navigating to result page...');
      this.router.navigate(['/result']);
    }
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
    const unanswered = this.getUnansweredQuestionsCount();
    if (unanswered === 0) {
      // All answered — skip modal, end directly
      this.endQuiz();
    } else {
      this.showEndModal = true;
    }
  }

  cancelEndQuiz() {
    this.showEndModal = false;
  }

  confirmEndNow() {
    this.showEndModal = false;
    this.endQuiz();
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

  showAnswer() {
    if (this.isReviewMode && this.currentQuestion < this.questionList.length) {
      const currentQuestionObj = this.questionList[this.currentQuestion];
      this.correctAnswerIndex = currentQuestionObj.options.findIndex((option: any) => option.correct);
      this.answerExplanation = currentQuestionObj.explanation || 'Tidak ada penjelasan tersedia untuk soal ini.';
    }
  }

  hideAnswer() {
    this.correctAnswerIndex = null;
    this.answerExplanation = '';
  }

  checkAnswer() {
    if (this.isReviewMode && this.currentQuestion < this.questionList.length) {
      const currentQuestionObj = this.questionList[this.currentQuestion];
      const selectedAnswer = this.selectedAnswers[this.currentQuestion];
      
      if (selectedAnswer !== null && selectedAnswer !== undefined) {
        this.isAnswerChecked = true;
        this.currentAnswerIsCorrect = currentQuestionObj.options[selectedAnswer].correct;
      }
    }
  }

  toggleExplanation() {
    this.showExplanation = !this.showExplanation;
  }

  resetAnswerCheck() {
    this.isAnswerChecked = false;
    this.showExplanation = false;
  }
}
