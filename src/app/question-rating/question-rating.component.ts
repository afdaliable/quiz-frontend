import { Component, Input, OnInit } from '@angular/core';
import {
  QuestionFeedbackService,
  RatingKind,
  RatingSummary
} from '../services/question-feedback.service';

@Component({
  selector: 'app-question-rating',
  templateUrl: './question-rating.component.html',
})
export class QuestionRatingComponent implements OnInit {
  @Input() questionId!: number;
  @Input() isDarkMode = false;

  summary: RatingSummary = { helpful_count: 0, confusing_count: 0, user_rating: null };
  loading = false;

  constructor(private feedbackService: QuestionFeedbackService) {}

  ngOnInit(): void {
    this.feedbackService.getRatings(this.questionId).subscribe(s => {
      if (s) this.summary = s;
    });
  }

  vote(kind: RatingKind): void {
    if (this.loading) return;
    const next: RatingKind | null = this.summary.user_rating === kind ? null : kind;
    this.loading = true;
    this.feedbackService.submitRating(this.questionId, next).subscribe(s => {
      if (s) this.summary = s;
      this.loading = false;
    });
  }

  get isHelpful(): boolean  { return this.summary.user_rating === 'helpful'; }
  get isConfusing(): boolean { return this.summary.user_rating === 'confusing'; }
}
