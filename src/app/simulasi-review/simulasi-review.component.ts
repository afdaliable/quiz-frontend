import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';

interface ReviewOption {
  text: string;
  correct: boolean;
  tkp_score: number | null;
}

interface ReviewQuestion {
  id: number;
  questionText: string;
  question_type: string;
  options: ReviewOption[];
  imageChoiceMode?: boolean;
  option_scores: Record<string, number> | null;
  explanation: string;
}

interface ReviewSection {
  name: string;
  count: number;
  startIndex: number;
  endIndex: number;
  section_duration_minutes?: number;
  // computed
  answered: number;
  correct: number;
}

@Component({
  selector: 'app-simulasi-review',
  templateUrl: './simulasi-review.component.html',
  styleUrls: ['./simulasi-review.component.css'],
})
export class SimulasiReviewComponent implements OnInit {
  isDarkMode = false;
  examName = 'Simulasi Ujian';
  questions: ReviewQuestion[] = [];
  selectedAnswers: (number | null)[] = [];
  sections: ReviewSection[] = [];
  hasData = false;
  readonly letters = ['A', 'B', 'C', 'D', 'E'];

  // One-question-per-page navigation (anti screenshot-dump)
  currentIndex = 0;

  constructor(private router: Router, private themeService: ThemeService) {}

  get currentQuestion(): ReviewQuestion | undefined {
    return this.questions[this.currentIndex];
  }

  get activeSection(): ReviewSection | undefined {
    return this.sections.find(
      s => this.currentIndex >= s.startIndex && this.currentIndex < s.endIndex
    );
  }

  get totalQuestions(): number {
    return this.questions.length;
  }

  goNext(): void {
    if (this.currentIndex < this.questions.length - 1) this.currentIndex++;
    this.scrollTop();
  }

  goPrev(): void {
    if (this.currentIndex > 0) this.currentIndex--;
    this.scrollTop();
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.scrollTop();
    }
  }

  private scrollTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtonClass(index: number): string {
    const answered = this.selectedAnswers[index] !== null && this.selectedAnswers[index] !== undefined;
    const q = this.questions[index];
    const isActive = index === this.currentIndex;
    if (isActive) return 'bg-blue-600 text-white';
    if (!answered) {
      return this.isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700 border border-gray-300';
    }
    // answered: green if correct, rose if wrong (skip correctness color for TKP — all "answered")
    if (this.isTkp(q)) return 'bg-indigo-500 text-white';
    return this.isCorrect(q, this.selectedAnswers[index]) ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white';
  }

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDark => (this.isDarkMode = isDark));

    const raw = localStorage.getItem('simulasiReview');
    if (!raw) {
      this.hasData = false;
      return;
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      this.hasData = false;
      return;
    }

    this.questions = Array.isArray(data?.questions) ? data.questions : [];
    this.selectedAnswers = Array.isArray(data?.selectedAnswers) ? data.selectedAnswers : [];
    this.examName = data?.examName || 'Simulasi Ujian';
    this.hasData = this.questions.length > 0;

    const rawSections: any[] = Array.isArray(data?.sections) ? data.sections : [];
    if (rawSections.length > 0) {
      this.sections = rawSections.map((s: any) => this.buildSection(s));
    } else if (this.hasData) {
      // No section metadata — treat whole quiz as one section
      this.sections = [
        this.buildSection(
          { name: 'Semua Soal', count: this.questions.length, startIndex: 0, endIndex: this.questions.length }
        ),
      ];
    }
  }

  private buildSection(s: any): ReviewSection {
    const startIndex = s.startIndex ?? 0;
    const endIndex = s.endIndex ?? this.questions.length;
    let answered = 0;
    let correct = 0;
    for (let i = startIndex; i < endIndex; i++) {
      const ans = this.selectedAnswers[i];
      if (ans === null || ans === undefined) continue;
      answered++;
      if (this.isCorrect(this.questions[i], ans)) correct++;
    }
    return {
      name: s.name ?? 'Subtest',
      count: (endIndex - startIndex) || s.count || 0,
      startIndex,
      endIndex,
      section_duration_minutes: s.section_duration_minutes,
      answered,
      correct,
    };
  }

  isTkp(q: ReviewQuestion | undefined): boolean {
    return q?.question_type === 'tkp';
  }

  isCorrect(q: ReviewQuestion | undefined, answerIndex: number | null): boolean {
    if (!q || answerIndex === null || answerIndex === undefined) return false;
    if (this.isTkp(q)) {
      // TKP "correct" = picked the best (5-point) option
      const optKey = `opt${answerIndex + 1}`;
      return (q.option_scores?.[optKey] ?? 0) === 5;
    }
    return !!q.options?.[answerIndex]?.correct;
  }

  correctIndex(q: ReviewQuestion): number {
    if (this.isTkp(q)) {
      return q.options.findIndex(o => o.tkp_score === 5);
    }
    return q.options.findIndex(o => o.correct);
  }

  tkpScoreFor(q: ReviewQuestion, optionIndex: number): number | null {
    return q.options?.[optionIndex]?.tkp_score ?? null;
  }

  optionLabel(q: ReviewQuestion, optionIndex: number): string {
    if (q.imageChoiceMode) return 'Pilihan ' + this.letters[optionIndex];
    return q.options?.[optionIndex]?.text ?? '';
  }

  statusLabel(q: ReviewQuestion, index: number): string {
    const ans = this.selectedAnswers[index];
    if (ans === null || ans === undefined) return '— Tidak dijawab';
    return this.isCorrect(q, ans) ? '✅ Benar' : '❌ Salah';
  }

  statusClass(q: ReviewQuestion, index: number): string {
    const ans = this.selectedAnswers[index];
    if (ans === null || ans === undefined) return 'text-gray-400';
    return this.isCorrect(q, ans) ? 'text-emerald-500' : 'text-rose-500';
  }

  tkpLabel(q: ReviewQuestion, index: number): string {
    const ans = this.selectedAnswers[index];
    if (ans === null || ans === undefined) return '— Tidak dijawab';
    const score = this.tkpScoreFor(q, ans) ?? 1;
    return 'Poin: ' + score;
  }

  isPicked(index: number, optionIndex: number): boolean {
    return this.selectedAnswers[index] === optionIndex;
  }

  isWrongPick(q: ReviewQuestion, index: number, optionIndex: number): boolean {
    return !this.isTkp(q) && this.selectedAnswers[index] === optionIndex && optionIndex !== this.correctIndex(q);
  }

  isCorrectOption(q: ReviewQuestion, optionIndex: number): boolean {
    return !this.isTkp(q) && optionIndex === this.correctIndex(q);
  }

  goBack(): void {
    this.router.navigate(['/simulasi-ujian']);
  }
}
