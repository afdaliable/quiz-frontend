import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { interval } from 'rxjs';
import { QuestionService } from '../services/question.service';
import { ActivatedRoute, Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Question } from '../services/question.service';
import { UserService } from '../services/user.service';
import { ThemeService } from '../services/theme.service';
import { PaketSoal } from '../models/paket-soal.model';
import { QuizSessionService, QuizSession } from '../services/quiz-session.service';
import { PomodoroService } from '../services/pomodoro.service';

interface SectionInfo {
  name: string;
  count: number;
  section_duration_minutes?: number;
  startIndex: number;
  endIndex: number;
}

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
  quizMode: 'exam' | 'study' | 'review' | 'simulasi' = 'exam';
  showExplanation: boolean = false;
  isAnswerChecked: boolean = false;
  currentAnswerIsCorrect: boolean = false;
  correctAnswerIndex: number | null = null;
  answerExplanation: string = '';

  // End quiz confirmation modal
  showEndModal: boolean = false;

  // ── Section-aware simulasi (AFD-253) ──────────────────────────────────────
  sections: SectionInfo[] = [];
  activeSectionIndex: number = 0;
  navigationMode: 'free' | 'section_locked' = 'free';
  hasPerSectionTimer: boolean = false;
  sectionRemainingSeconds: number = 0;
  private sectionTimerInterval: any;
  private sectionTimerToast30Shown: boolean = false;
  private sectionTimerToast15Shown: boolean = false;
  private sectionTimerToast5Shown: boolean = false;

  // Section modals
  showSectionConfirmModal: boolean = false;
  showSectionTimeUpModal: boolean = false;
  sectionTimeUpCountdown: number = 3;
  private sectionTimeUpInterval: any;
  showSubmitReviewModal: boolean = false;

  get activeSection(): SectionInfo | null {
    return this.sections[this.activeSectionIndex] ?? null;
  }
  get isLastSection(): boolean {
    return this.activeSectionIndex === this.sections.length - 1;
  }
  canNavigateToQuestion(index: number): boolean {
    if (this.navigationMode !== 'section_locked' || this.sections.length === 0) return true;
    const sec = this.activeSection;
    return sec ? (index >= sec.startIndex && index < sec.endIndex) : true;
  }
  isSectionStart(index: number): boolean {
    return this.sections.some(s => s.startIndex === index);
  }
  getSectionName(index: number): string {
    return this.sections.find(s => s.startIndex <= index && index < s.endIndex)?.name ?? '';
  }
  getAnsweredCountForSection(sec: SectionInfo): number {
    let count = 0;
    for (let i = sec.startIndex; i < sec.endIndex; i++) {
      if (this.answeredQuestions[i]) count++;
    }
    return count;
  }
  formatSectionTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  // ──────────────────────────────────────────────────────────────────────────

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

  // Question slide animation
  isAnimating: boolean = false;
  questionCardClass: string = '';
  private slideDirection: 'forward' | 'backward' | 'direct' = 'forward';

  constructor(
    private questionService: QuestionService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService,
    private quizSessionService: QuizSessionService,
    public pomodoroService: PomodoroService
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
    this.quizMode = (localStorage.getItem('quizMode') as 'exam' | 'study' | 'review' | 'simulasi') || 'exam';
    // Derive isReviewMode from quizMode for backward compatibility
    this.isReviewMode = this.quizMode === 'review';

    this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);

    // Handle simulasi session — preloaded questions from /simulasi-ujian/:id/start
    const simulasiSessionDataStr = localStorage.getItem('simulasiSessionData');
    if (this.quizMode === 'simulasi' && simulasiSessionDataStr) {
      localStorage.removeItem('simulasiSessionData');
      try {
        const simData = JSON.parse(simulasiSessionDataStr);
        this.selectedPaket = {
          id: 0,
          id_nama_paket_soal: 0,
          kategori_soal: simData.kategori_soal || 'Simulasi',
          nama_paket_soal: simData.nama_paket_soal || 'Simulasi Ujian',
          jumlah_soal: simData.total_questions,
          is_premium: false,
          created_at: new Date().toISOString(),
        } as any;
        this.currentSession = { id: simData.session_id, session_type: 'simulasi' } as QuizSession;
        this.sessionInitialized = true;

        // AFD-253: parse navigation_mode + sections
        this.navigationMode = (simData.navigation_mode as 'free' | 'section_locked') ?? 'free';
        if (Array.isArray(simData.sections) && simData.sections.length > 0) {
          let pos = 0;
          this.sections = simData.sections.map((s: any) => {
            const sec: SectionInfo = {
              name: s.name,
              count: s.count,
              section_duration_minutes: s.section_duration_minutes,
              startIndex: pos,
              endIndex: pos + s.count,
            };
            pos += s.count;
            return sec;
          });
          this.hasPerSectionTimer = this.sections.some(s => s.section_duration_minutes != null);
        }

        this.loadRandomQuestions(simData.questions);
        this.setupAutoSave();
      } catch (error) {
        console.error('Error loading simulasi session:', error);
        alert('Gagal memuat soal simulasi. Silakan coba lagi.');
        this.router.navigate(['/simulasi-ujian']);
      }
      return;
    }

    // Handle random session
    const randomSessionDataStr = localStorage.getItem('randomSessionData');
    if (randomSessionDataStr) {
      localStorage.removeItem('randomSessionData');
      try {
        const randomData = JSON.parse(randomSessionDataStr);
        this.selectedPaket = {
          id: 0,
          id_nama_paket_soal: 0,
          kategori_soal: randomData.kategori_soal || 'Random',
          nama_paket_soal: randomData.nama_paket_soal || 'Latihan Random',
          jumlah_soal: randomData.total_questions,
          is_premium: false,
          created_at: new Date().toISOString()
        } as any;
        this.currentSession = { id: randomData.session_id, session_type: 'random' } as QuizSession;
        this.sessionInitialized = true;
        this.loadRandomQuestions(randomData.questions);
        this.setupAutoSave();
      } catch (error) {
        console.error('Error loading random session:', error);
        alert('Gagal memuat soal random. Silakan coba lagi.');
        this.router.navigate(['/home']);
      }
      return;
    }

    // Handle bookmark quiz session
    const bookmarkQuizDataStr = localStorage.getItem('bookmarkQuizData');
    if (bookmarkQuizDataStr) {
      localStorage.removeItem('bookmarkQuizData');
      try {
        const bookmarkData = JSON.parse(bookmarkQuizDataStr);
        this.selectedPaket = {
          id: 0,
          id_nama_paket_soal: 0,
          kategori_soal: bookmarkData.kategori_soal || 'Bookmark',
          nama_paket_soal: bookmarkData.nama_paket_soal || 'Latihan Bookmark',
          jumlah_soal: bookmarkData.questions.length,
          is_premium: false,
          created_at: new Date().toISOString()
        } as any;
        this.sessionInitialized = true;
        this.loadBookmarkQuestions(bookmarkData.questions);
      } catch (error) {
        console.error('Error loading bookmark quiz:', error);
        alert('Gagal memuat soal bookmark. Silakan coba lagi.');
        this.router.navigate(['/bookmarks']);
      }
      return;
    }

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

  private loadRandomQuestions(questions: any[]): void {
    this.questionList = questions.map((q: any) => {
      const optKeys = ['opt1', 'opt2', 'opt3', 'opt4', 'opt5'];
      let opts = optKeys
        .filter(k => q[k] != null && String(q[k]).trim() !== '')
        .map(k => ({
          text: q[k],
          correct: q.correct_answer === k,
          tkp_score: q.option_scores ? (q.option_scores[k] ?? null) : null,
        }));

      let questionText = q.soal || '';

      // Some soal have options embedded in soal text (opt1-opt5 are empty).
      // Parse "A. ... B. ... C. ..." pattern out of the text.
      if (opts.length === 0 && questionText) {
        const parsed = this.parseEmbeddedOptions(questionText);
        if (parsed) {
          questionText = parsed.stem;
          opts = parsed.options.map((text, i) => ({
            text,
            correct: q.correct_answer === optKeys[i],
            tkp_score: q.option_scores ? (q.option_scores[optKeys[i]] ?? null) : null,
          }));
        }
      }

      return {
        id: q.id,
        questionText,
        question_type: q.question_type || 'multiple_choice',
        options: opts,
        option_scores: q.option_scores || null,
        explanation: q.solution || '',
      };
    });

    this.answeredQuestions = new Array(this.questionList.length).fill(false);
    this.selectedAnswers = new Array(this.questionList.length).fill(null);
    this.markedQuestions = new Array(this.questionList.length).fill(false);

    if (this.quizMode === 'exam') {
      this.startTimer();
    } else if (this.quizMode === 'simulasi') {
      if (this.hasPerSectionTimer) {
        // LPDP: per-section timer only, no global countdown
        this.startSectionTimer();
      } else {
        // SKD/RBB/STAN/PPPK: global countdown
        this.startTimer();
      }
    }
    this.getProgressPercent();

    this.showKeyboardHint = true;
    this.keyboardHintTimer = setTimeout(() => {
      this.showKeyboardHint = false;
    }, 5000);
  }

  private parseEmbeddedOptions(text: string): { stem: string; options: string[] } | null {
    const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Try multiple option formats: "A. ", "(A) ", "A) ", "A : "
    const formats = [
      // A. opt  B. opt  C. opt  (D. opt)  (E. opt)
      /^([\s\S]*?)\s+A\.\s+([\s\S]+?)\s+B\.\s+([\s\S]+?)\s+C\.\s+([\s\S]+?)(?:\s+D\.\s+([\s\S]+?))?(?:\s+E\.\s+([\s\S]+?))?$/,
      // (A) opt  (B) opt  (C) opt  ((D) opt)  ((E) opt)
      /^([\s\S]*?)\s+\(A\)\s+([\s\S]+?)\s+\(B\)\s+([\s\S]+?)\s+\(C\)\s+([\s\S]+?)(?:\s+\(D\)\s+([\s\S]+?))?(?:\s+\(E\)\s+([\s\S]+?))?$/,
      // A) opt  B) opt  C) opt
      /^([\s\S]*?)\s+A\)\s+([\s\S]+?)\s+B\)\s+([\s\S]+?)\s+C\)\s+([\s\S]+?)(?:\s+D\)\s+([\s\S]+?))?(?:\s+E\)\s+([\s\S]+?))?$/,
    ];

    for (const pattern of formats) {
      const match = stripped.match(pattern);
      if (!match) continue;
      const stem = match[1].trim();
      const options = [match[2], match[3], match[4], match[5], match[6]]
        .filter(Boolean)
        .map(o => o.trim());
      if (options.length >= 2) return { stem, options };
    }
    return null;
  }

  private loadBookmarkQuestions(questions: any[]): void {
    this.questionList = questions.map((q: any) => ({
      id: q.id,
      question: q.questionText,
      options: q.options || [],
      explanation: q.explanation || '',
    }));

    this.answeredQuestions = new Array(this.questionList.length).fill(false);
    this.selectedAnswers = new Array(this.questionList.length).fill(null);
    this.markedQuestions = new Array(this.questionList.length).fill(false);

    if (this.quizMode === 'exam') {
      this.startTimer();
    }
    this.getProgressPercent();

    this.showKeyboardHint = true;
    this.keyboardHintTimer = setTimeout(() => {
      this.showKeyboardHint = false;
    }, 5000);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Disable shortcuts when user is typing in an input/textarea/select
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
    // Disable if modal is open
    if (this.showEndModal) return;

    switch (event.key) {
      // Answer selection (existing)
      case '1': case 'a': case 'A': this.answerByKey(0); break;
      case '2': case 'b': case 'B': this.answerByKey(1); break;
      case '3': case 'c': case 'C': this.answerByKey(2); break;
      case '4': case 'd': case 'D': this.answerByKey(3); break;
      case '5': case 'e': case 'E': this.answerByKey(4); break;

      // Navigation (existing ArrowRight/Left + new N/P)
      case 'n': case 'N':
      case 'ArrowRight':
        if (this.currentQuestion < this.questionList.length - 1) this.nextQuestion();
        break;
      case 'p': case 'P':
      case 'ArrowLeft':
        if (this.currentQuestion > 0) this.prevQuestion();
        break;

      // Mark question (existing T)
      case 't': case 'T': this.toggleMarkQuestion(); break;

      // Confirm & advance — only if answer already selected and not focused on a button/link
      case 'Enter':
      case ' ':
        if (target.tagName === 'BUTTON' || target.tagName === 'A') break;
        if (this.selectedAnswers[this.currentQuestion] !== null &&
            this.selectedAnswers[this.currentQuestion] !== undefined &&
            this.currentQuestion < this.questionList.length - 1) {
          event.preventDefault();
          this.nextQuestion();
        }
        break;

      // Clear current answer (exam mode only)
      case 'Escape':
        this.clearCurrentAnswer();
        break;
    }
  }

  clearCurrentAnswer(): void {
    if (this.quizMode !== 'exam') return;
    this.selectedAnswers[this.currentQuestion] = null;
    this.answeredQuestions[this.currentQuestion] = false;
    this.saveUserAnswers();
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
    // Section timer cleanup (AFD-253)
    this.stopSectionTimer();
    if (this.sectionTimeUpInterval) clearInterval(this.sectionTimeUpInterval);

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
          if (this.quizMode === 'exam') {
            this.startTimer();
          }
          // In study/review mode, no timer needed
          this.getProgressPercent();

          // In study mode, auto-reveal correct answer for the first question
          if (this.quizMode === 'study') {
            this.revealStudyAnswer();
          }

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
    if (this.isAnimating) return;

    // section_locked: check if at end of active section
    if (this.quizMode === 'simulasi' && this.navigationMode === 'section_locked' && this.activeSection) {
      const sec = this.activeSection;
      if (this.currentQuestion === sec.endIndex - 1) {
        // At last question of current section
        if (this.isLastSection) {
          this.openSubmitReview();
        } else {
          this.showSectionConfirmModal = true;
        }
        return;
      }
    }

    if (this.currentQuestion < this.questionList.length - 1) {
      this.navigateWithAnimation(this.currentQuestion + 1, 'forward');
    } else if (this.quizMode === 'exam') {
      this.isQuizCompleted = true;
      this.stopTimer();
    } else if (this.quizMode === 'simulasi') {
      this.openSubmitReview();
    }
    // In study/review mode, don't auto-complete — user uses the end button
  }

  prevQuestion() {
    if (this.isAnimating) return;
    if (this.currentQuestion > 0) {
      this.navigateWithAnimation(this.currentQuestion - 1, 'backward');
    }
  }

  private navigateWithAnimation(targetIndex: number, direction: 'forward' | 'backward' | 'direct'): void {
    if (this.isAnimating || targetIndex === this.currentQuestion) return;

    this.isAnimating = true;
    this.slideDirection = direction;

    // Apply leave animation
    this.questionCardClass = direction === 'forward'
      ? 'question-leave-left'
      : direction === 'backward'
      ? 'question-leave-right'
      : 'question-fade-out';

    // After leave animation, switch content and enter
    setTimeout(() => {
      this.currentQuestion = targetIndex;
      this.getProgressPercent();
      this.resetAnswerCheck();

      // Apply enter animation
      this.questionCardClass = direction === 'forward'
        ? 'question-enter-right'
        : direction === 'backward'
        ? 'question-enter-left'
        : 'question-fade-in';

      // Clear animation class after enter completes
      setTimeout(() => {
        this.questionCardClass = '';
        this.isAnimating = false;
      }, 220);
    }, 200);
  }

  answerByKey(optionIndex: number): void {
    const options = this.questionList[this.currentQuestion]?.options;
    if (options && optionIndex < options.length) {
      this.answer(this.currentQuestion, optionIndex);
    }
  }

  answer(currentQno: number, option: number) {
    // Only record first-time answers for Pomodoro
    if (!this.answeredQuestions[currentQno]) {
      this.pomodoroService.recordAnswer();
    }
    this.selectedAnswers[currentQno] = option;
    this.answeredQuestions[currentQno] = true;

    // Save to localStorage (legacy support)
    this.saveUserAnswers();

    // Save to session (new feature)
    if (this.currentSession) {
      this.saveProgressToSession();
    }

    // In study mode, show immediate full feedback (correct answer + explanation auto-open)
    if (this.quizMode === 'study' && currentQno === this.currentQuestion) {
      const currentQuestionObj = this.questionList[currentQno];
      const isTkp = currentQuestionObj.question_type === 'tkp';

      if (isTkp) {
        const optKey = `opt${option + 1}`;
        const poin = currentQuestionObj.option_scores?.[optKey] ?? 1;
        this.currentAnswerIsCorrect = poin === 5;
        this.correctAnswerIndex = currentQuestionObj.options.findIndex((o: any) => o.tkp_score === 5);
      } else {
        this.correctAnswerIndex = currentQuestionObj.options.findIndex((opt: any) => opt.correct);
        this.currentAnswerIsCorrect = currentQuestionObj.options[option].correct;
      }
      this.isAnswerChecked = true;
      this.answerExplanation = currentQuestionObj.explanation || currentQuestionObj.solution
        || 'Tidak ada penjelasan tersedia untuk soal ini.';
      this.showExplanation = true;
    } else if (this.quizMode === 'review') {
      // Review mode: user manually checks answer via button
      this.isAnswerChecked = false;
      this.showExplanation = false;
    }
  }

  calculateScore() {
    this.correctAnswer = 0;
    this.incorrectAnswer = 0;
    let rawScore = 0;
    let maxScore = 0;
    const wrongNumbers: number[] = [];

    this.questionList.forEach((question: any, index: number) => {
      const selectedAnswer = this.selectedAnswers[index];
      const isTkp = question.question_type === 'tkp';
      maxScore += 5;

      if (selectedAnswer !== null && selectedAnswer !== undefined) {
        if (isTkp) {
          const optKey = `opt${selectedAnswer + 1}`;
          const poin = question.option_scores?.[optKey] ?? 1;
          rawScore += poin;
          this.correctAnswer++;
        } else {
          if (question.options[selectedAnswer]?.correct) {
            rawScore += 5;
            this.correctAnswer++;
          } else {
            this.incorrectAnswer++;
            wrongNumbers.push(index + 1);
          }
        }
      }
    });

    this.points = maxScore > 0
      ? Math.round((rawScore / maxScore) * 100)
      : 0;

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
    if (this.interval$) {
      this.interval$.unsubscribe();
    }
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
    if (index === this.currentQuestion) return;
    if (!this.canNavigateToQuestion(index)) return;
    this.navigateWithAnimation(index, 'direct');
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
          this.triggerToast('⏱️ Waktu habis!');
          this.endQuiz();
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

  // ── Section timer methods (AFD-253) ───────────────────────────────────────

  startSectionTimer(): void {
    this.stopSectionTimer();
    const sec = this.activeSection;
    if (!sec?.section_duration_minutes) return;
    this.sectionRemainingSeconds = sec.section_duration_minutes * 60;
    this.sectionTimerToast30Shown = false;
    this.sectionTimerToast15Shown = false;
    this.sectionTimerToast5Shown = false;
    this.sectionTimerInterval = setInterval(() => {
      if (this.sectionRemainingSeconds > 0) {
        this.sectionRemainingSeconds--;
        if (this.sectionRemainingSeconds === 30 * 60 && !this.sectionTimerToast30Shown) {
          this.sectionTimerToast30Shown = true;
          this.triggerToast(`⏱️ Sisa 30 menit di ${this.activeSection?.name}`);
        } else if (this.sectionRemainingSeconds === 15 * 60 && !this.sectionTimerToast15Shown) {
          this.sectionTimerToast15Shown = true;
          this.triggerToast(`⚠️ Sisa 15 menit di ${this.activeSection?.name}`);
        } else if (this.sectionRemainingSeconds === 5 * 60 && !this.sectionTimerToast5Shown) {
          this.sectionTimerToast5Shown = true;
          this.triggerToast(`🔴 Sisa 5 menit di ${this.activeSection?.name}`);
        }
      } else {
        this.stopSectionTimer();
        this.onSectionTimerExpired();
      }
    }, 1000);
  }

  stopSectionTimer(): void {
    if (this.sectionTimerInterval) {
      clearInterval(this.sectionTimerInterval);
      this.sectionTimerInterval = null;
    }
  }

  onSectionTimerExpired(): void {
    const expiredName = this.activeSection?.name ?? 'Section';
    this.sectionTimeUpCountdown = 3;
    this.showSectionTimeUpModal = true;
    this.sectionTimeUpInterval = setInterval(() => {
      this.sectionTimeUpCountdown--;
      this.cdr.detectChanges();
      if (this.sectionTimeUpCountdown <= 0) {
        clearInterval(this.sectionTimeUpInterval);
        this.showSectionTimeUpModal = false;
        this.advanceToNextSection('timer_expired');
      }
    }, 1000);
  }

  advanceToNextSection(reason: 'manual' | 'timer_expired'): void {
    this.stopSectionTimer();
    this.showSectionConfirmModal = false;
    if (this.isLastSection) {
      this.endQuiz();
      return;
    }
    this.activeSectionIndex++;
    const sec = this.activeSection;
    if (sec) {
      this.navigateWithAnimation(sec.startIndex, 'forward');
    }
    if (this.hasPerSectionTimer) {
      this.startSectionTimer();
    }
  }

  openSubmitReview(): void {
    this.showSubmitReviewModal = true;
  }

  confirmSubmit(): void {
    this.showSubmitReviewModal = false;
    this.endQuiz();
  }

  cancelSubmitReview(): void {
    this.showSubmitReviewModal = false;
  }

  getUnansweredInCurrentSession(): number[] {
    const unanswered: number[] = [];
    for (let i = 0; i < this.questionList.length; i++) {
      if (!this.answeredQuestions[i]) unanswered.push(i + 1);
    }
    return unanswered;
  }

  getMarkedNumbers(): number[] {
    const marked: number[] = [];
    for (let i = 0; i < this.questionList.length; i++) {
      if (this.markedQuestions[i]) marked.push(i + 1);
    }
    return marked;
  }

  get nextButtonLabel(): string {
    if (this.quizMode === 'simulasi' && this.navigationMode === 'section_locked' && this.activeSection) {
      const sec = this.activeSection;
      if (this.currentQuestion === sec.endIndex - 1) {
        if (this.isLastSection) return 'Submit Simulasi';
        const nextSec = this.sections[this.activeSectionIndex + 1];
        return `Lanjut ke ${nextSec?.name ?? 'Section Berikutnya'} →`;
      }
    }
    if (this.currentQuestion === this.questionList.length - 1 && this.quizMode === 'simulasi') {
      return 'Submit Simulasi';
    }
    return this.quizMode === 'exam' ? 'Selanjutnya' : 'Soal Berikutnya';
  }

  get isNextButtonSectionAdvance(): boolean {
    if (this.quizMode !== 'simulasi' || this.navigationMode !== 'section_locked') return false;
    const sec = this.activeSection;
    return sec != null && this.currentQuestion === sec.endIndex - 1 && !this.isLastSection;
  }

  // ──────────────────────────────────────────────────────────────────────────

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
    this.stopSectionTimer();
    this.calculateScore();

    // Save to localStorage - for all modes so result page can display stats
    localStorage.setItem('totalQuestions', this.questionList.length.toString());
    localStorage.setItem(
      'answeredQuestions',
      this.getAnsweredQuestionsCount().toString()
    );
    localStorage.setItem('points', this.points.toString());
    localStorage.setItem('correctAnswers', this.correctAnswer.toString());
    localStorage.setItem(
      'incorrectAnswers',
      this.incorrectAnswer.toString()
    );
    this.saveUserAnswers();

    // AFD-254/256: persist simulasi review snapshot (sections + answers + questions)
    if (this.quizMode === 'simulasi') {
      try {
        localStorage.setItem('simulasiReview', JSON.stringify({
          questions: this.questionList,
          selectedAnswers: this.selectedAnswers,
          sections: this.sections,
          navigationMode: this.navigationMode,
          examName: this.selectedPaket?.nama_paket_soal ?? 'Simulasi Ujian',
        }));
      } catch (e) {
        console.error('Failed to persist simulasi review data:', e);
      }
    }

    // Collect Pomodoro stats before stopping
    const pomodoroStats = this.pomodoroService.getCompletionStats();
    this.pomodoroService.stop();

    // Complete session — exam and simulasi modes
    if ((this.quizMode === 'exam' || this.quizMode === 'simulasi') && this.currentSession) {
      this.quizSessionService.completeQuizSession(this.currentSession.id, {
        answers: this.selectedAnswers,
        time_remaining: this.remainingTime,
        pomodoro_enabled: pomodoroStats.pomodoroEnabled,
        pomodoro_sessions: pomodoroStats.pomodoroSessions,
        pomodoro_focus_minutes: pomodoroStats.pomodoroFocusMinutes,
        pomodoro_questions_answered: pomodoroStats.pomodoroQuestionsAnswered,
      }).subscribe({
        next: (completedSession) => {
          console.log('Quiz session completed:', completedSession);
          localStorage.setItem('completedSessionId', completedSession.id);
          if (completedSession.xp_breakdown) {
            localStorage.setItem('xpBreakdown', JSON.stringify(completedSession.xp_breakdown));
          }
          if (completedSession.xp_result) {
            localStorage.setItem('xpResult', JSON.stringify(completedSession.xp_result));
          }
          this.router.navigate(['/result']);
        },
        error: (error) => {
          console.error('Error completing session:', error);
          this.router.navigate(['/result']);
        }
      });
    } else {
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
      if (this.answeredQuestions[index] && this.currentQuestion === index) {
        return 'bg-green-600 text-white ring-2 ring-blue-400 ring-offset-1';
      } else if (this.answeredQuestions[index]) {
        return 'bg-green-600 text-white';
      } else if (this.currentQuestion === index) {
        return 'bg-blue-600 text-white';
      } else if (this.markedQuestions[index]) {
        return 'bg-yellow-500 text-white';
      } else {
        return 'bg-gray-700 text-gray-200';
      }
    } else {
      if (this.answeredQuestions[index] && this.currentQuestion === index) {
        return 'bg-green-500 text-white ring-2 ring-blue-400 ring-offset-1';
      } else if (this.answeredQuestions[index]) {
        return 'bg-green-500 text-white';
      } else if (this.currentQuestion === index) {
        return 'bg-blue-500 text-white';
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
    this.correctAnswerIndex = null;
    this.answerExplanation = '';

    // In study mode, immediately reveal the new question's answer
    if (this.quizMode === 'study') {
      this.revealStudyAnswer();
    }
  }

  /**
   * Auto-reveal correct answer + explanation for the current question (study mode)
   */
  revealStudyAnswer(): void {
    if (this.quizMode !== 'study' || !this.questionList[this.currentQuestion]) return;

    const q = this.questionList[this.currentQuestion];
    this.correctAnswerIndex = q.options.findIndex((opt: any) => opt.correct);
    this.answerExplanation = q.explanation || q.solution || 'Tidak ada penjelasan tersedia untuk soal ini.';
    this.isAnswerChecked = true;
    this.showExplanation = true;
    this.currentAnswerIsCorrect = true; // Showing the correct answer
  }

  getEndButtonLabel(): string {
    switch (this.quizMode) {
      case 'study': return 'Akhiri Belajar';
      case 'review': return 'Akhiri Review';
      case 'simulasi': return 'Submit Simulasi';
      default: return 'Akhiri Kuis';
    }
  }

  getEndModalTitle(): string {
    switch (this.quizMode) {
      case 'study': return 'Yakin ingin mengakhiri belajar?';
      case 'review': return 'Yakin ingin mengakhiri review?';
      case 'simulasi': return 'Yakin ingin submit simulasi?';
      default: return 'Yakin ingin mengakhiri kuis?';
    }
  }

  getContinueButtonLabel(): string {
    switch (this.quizMode) {
      case 'study': return 'Lanjutkan Belajar';
      case 'review': return 'Lanjutkan Review';
      case 'simulasi': return 'Lanjutkan Simulasi';
      default: return 'Lanjutkan Kuis';
    }
  }

  get isSimulasiMode(): boolean {
    return this.quizMode === 'simulasi';
  }

  get simulasiData(): { simulasi_id: number; attempt_number: number; passing_score: number; session_id: string } | null {
    const raw = localStorage.getItem('simulasiData');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.isSimulasiMode && !this.isQuizCompleted) {
      event.preventDefault();
      event.returnValue = 'Simulasi sedang berjalan. Timer tidak berhenti jika kamu keluar. Yakin keluar?';
    }
  }
}
