import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  QuestionFeedbackService,
  ReportReason,
  SubmitReportRequest
} from '../services/question-feedback.service';

@Component({
  selector: 'app-question-report-modal',
  templateUrl: './question-report-modal.component.html',
})
export class QuestionReportModalComponent {
  @Input() questionId!: number;
  @Input() isDarkMode = false;
  @Output() closed = new EventEmitter<void>();

  readonly reasons: { value: ReportReason; label: string }[] = [
    { value: 'wrong_answer',        label: 'Jawaban salah' },
    { value: 'unclear_explanation', label: 'Penjelasan kurang jelas' },
    { value: 'not_relevant',        label: 'Soal tidak relevan' },
    { value: 'duplicate',           label: 'Soal duplikat' },
    { value: 'other',               label: 'Lainnya' },
  ];

  selectedReason: ReportReason | null = null;
  detail = '';
  submitting = false;
  submitted = false;
  error = '';

  constructor(private feedbackService: QuestionFeedbackService) {}

  submit(): void {
    if (!this.selectedReason || this.submitting) return;

    this.submitting = true;
    this.error = '';

    const req: SubmitReportRequest = {
      reason: this.selectedReason,
      detail: this.detail.trim() || undefined,
    };

    this.feedbackService.submitReport(this.questionId, req).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res) {
          this.submitted = true;
          setTimeout(() => this.close(), 1800);
        } else {
          this.error = 'Gagal mengirim laporan. Coba lagi.';
        }
      },
      error: () => {
        this.submitting = false;
        this.error = 'Gagal mengirim laporan. Coba lagi.';
      }
    });
  }

  close(): void {
    this.closed.emit();
  }
}
