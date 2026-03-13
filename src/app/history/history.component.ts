import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../services/theme.service';
import { QuestionService } from '../services/question.service';
import { QuizHistoryEntry, QuizHistoryResponse } from '../models/quiz-history.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  isDarkMode = false;
  isLoading = true;
  history: QuizHistoryEntry[] = [];
  filteredHistory: QuizHistoryEntry[] = [];
  searchTerm = '';
  total = 0;
  page = 1;
  limit = 20;

  constructor(
    private themeService: ThemeService,
    private questionService: QuestionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDark => this.isDarkMode = isDark);
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.questionService.getQuizHistory(this.page, this.limit).subscribe({
      next: (res: QuizHistoryResponse) => {
        this.history = res.data;
        this.filteredHistory = res.data;
        this.total = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadHistory();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadHistory();
    }
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} detik`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m} menit ${s} detik` : `${m} menit`;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${date}, ${h}:${m}`;
  }

  scoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  }

  scoreBg(score: number): string {
    if (score >= 80) return this.isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50';
    if (score >= 60) return this.isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50';
    return this.isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50';
  }

  filterHistory(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredHistory = this.history.filter(entry =>
      entry.package_name.toLowerCase().includes(term) ||
      entry.category.toLowerCase().includes(term)
    );
  }

  get avgScore(): number {
    if (!this.history.length) return 0;
    return Math.round(this.history.reduce((sum, e) => sum + e.score, 0) / this.history.length);
  }

  get bestScore(): number {
    if (!this.history.length) return 0;
    return Math.max(...this.history.map(e => e.score));
  }

  goToReview(entryId: string): void {
    localStorage.setItem('attemptId', entryId);
    this.router.navigate(['/review']);
  }
}
