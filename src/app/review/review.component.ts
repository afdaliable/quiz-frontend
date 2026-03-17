import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { QuestionService } from '../services/question.service';
import { ThemeService } from '../services/theme.service';
import { BookMarkService } from '../services/bookmark.service';
import { Subscription } from 'rxjs';

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
export class ReviewComponent implements OnInit, OnDestroy {
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
  bookmarkedQuestions: Set<string> = new Set();
  bookmarkLoading: boolean = false;

  // Toast state
  toastMessage: string = '';
  toastVisible: boolean = false;
  toastSuccess: boolean = true;
  private toastTimer: any = null;

  private bookmarkSubscription: Subscription | null = null;
  private themeSubscription: Subscription | null = null;

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private userService: UserService,
    private themeService: ThemeService,
    private bookMarkService: BookMarkService
  ) {}

  ngOnInit(): void {
    this.loadReviewData();
    this.themeSubscription = this.themeService.darkMode$.subscribe(
      isDark => this.isDarkMode = isDark
    );
    this.loadBookmarks();
  }

  ngOnDestroy(): void {
    if (this.bookmarkSubscription) this.bookmarkSubscription.unsubscribe();
    if (this.themeSubscription) this.themeSubscription.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  loadReviewData(): void {
    const userData = localStorage.getItem('user');
    if (userData) this.currentUser = JSON.parse(userData);

    const paketData = localStorage.getItem('selectedPaket');
    if (paketData) {
      this.selectedPaket = JSON.parse(paketData);

      // Untuk sesi random: gunakan soal yang sudah disimpan, bukan re-fetch dari API
      const randomQuestionsStr = localStorage.getItem('randomReviewQuestions');
      if (randomQuestionsStr) {
        try {
          this.questionList = JSON.parse(randomQuestionsStr);
        } catch {
          this.loadQuestions();
        }
      } else {
        this.loadQuestions();
      }
    }

    const answersData = localStorage.getItem('selectedAnswers');
    if (answersData) this.selectedAnswers = JSON.parse(answersData);
  }

  loadQuestions(): void {
    if (this.selectedPaket) {
      this.questionService
        .getQuestions(this.selectedPaket.kategori_soal, this.selectedPaket.nama_paket_soal)
        .subscribe({
          next: (questions: Question[]) => { this.questionList = questions; },
          error: (error) => { console.error('Error loading questions:', error); }
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
    return userAnswer !== undefined ? ['A', 'B', 'C', 'D', 'E'][userAnswer] : 'Tidak dijawab';
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  loadBookmarks(): void {
    this.bookmarkSubscription = this.bookMarkService.getAllBookmarks().subscribe(
      bookmarkIds => {
        this.bookmarkedQuestions = new Set(bookmarkIds);
      }
    );
  }

  /** Toggle bookmark untuk soal yang sedang aktif (dipanggil dari navigation panel) */
  toggleCurrentBookmark(): void {
    if (this.bookmarkLoading || !this.questionList[this.currentQuestion]) return;

    const question = this.questionList[this.currentQuestion];
    const questionId = question.id.toString();
    this.bookmarkLoading = true;

    this.bookMarkService.toggleBookmark(questionId).subscribe({
      next: () => {
        const wasBookmarked = this.bookmarkedQuestions.has(questionId);
        if (wasBookmarked) {
          this.bookmarkedQuestions.delete(questionId);
          this.showToast('Bookmark dihapus', false);
        } else {
          this.bookmarkedQuestions.add(questionId);
          this.showToast('Soal berhasil di-bookmark', true);
        }
        this.bookmarkLoading = false;
      },
      error: (error) => {
        console.error('Failed to toggle bookmark:', error);
        this.showToast('Gagal mengubah bookmark', false);
        this.bookmarkLoading = false;
      }
    });
  }

  get isCurrentQuestionBookmarked(): boolean {
    if (!this.questionList[this.currentQuestion]) return false;
    return this.bookmarkedQuestions.has(this.questionList[this.currentQuestion].id.toString());
  }

  isQuestionBookmarked(index: number): boolean {
    if (!this.questionList[index]) return false;
    return this.bookmarkedQuestions.has(this.questionList[index].id.toString());
  }

  private showToast(message: string, success: boolean): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastSuccess = success;
    this.toastVisible = true;
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2500);
  }
}
