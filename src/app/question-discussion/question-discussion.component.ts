import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommentService } from '../services/comment.service';
import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { Comment } from '../models/comment.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-question-discussion',
  templateUrl: './question-discussion.component.html',
  styleUrls: ['./question-discussion.component.css']
})
export class QuestionDiscussionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() questionId!: number;

  comments: Comment[] = [];
  isLoading: boolean = false;
  isPosting: boolean = false;
  newCommentText: string = '';
  replyTarget: Comment | null = null;
  isDarkMode: boolean = false;
  isAuthenticated: boolean = false;
  errorMessage: string = '';

  private themeSubscription: Subscription | null = null;

  constructor(
    private commentService: CommentService,
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkMode$.subscribe(
      isDark => (this.isDarkMode = isDark)
    );
    this.isAuthenticated = !!this.authService.getToken();
    this.authService.user$.subscribe(user => {
      this.isAuthenticated = !!user;
    });

    if (this.questionId) {
      this.loadComments();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      this.comments = [];
      this.replyTarget = null;
      this.newCommentText = '';
      this.errorMessage = '';
      this.loadComments();
    }
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) this.themeSubscription.unsubscribe();
  }

  loadComments(): void {
    if (!this.questionId) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.commentService.getComments(this.questionId).subscribe({
      next: (data) => {
        this.comments = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        // Silent fail — fitur diskusi tidak boleh blok tampilan soal
      }
    });
  }

  loadReplies(comment: Comment): void {
    if (comment.showReplies) {
      comment.showReplies = false;
      return;
    }
    if (comment.replies && comment.replies.length > 0) {
      comment.showReplies = true;
      return;
    }
    comment.loadingReplies = true;
    this.commentService.getReplies(this.questionId, comment.id).subscribe({
      next: (replies) => {
        comment.replies = replies;
        comment.showReplies = true;
        comment.loadingReplies = false;
      },
      error: () => {
        comment.loadingReplies = false;
      }
    });
  }

  submitComment(): void {
    const text = this.newCommentText.trim();
    if (!text || this.isPosting) return;

    this.isPosting = true;
    this.errorMessage = '';
    const parentId = this.replyTarget?.id;

    this.commentService.postComment(this.questionId, text, parentId).subscribe({
      next: (newComment) => {
        if (parentId && this.replyTarget) {
          // Tambahkan ke replies parent
          if (!this.replyTarget.replies) this.replyTarget.replies = [];
          this.replyTarget.replies.push(newComment);
          this.replyTarget.showReplies = true;
          this.replyTarget.reply_count = (this.replyTarget.reply_count || 0) + 1;
        } else {
          this.comments.unshift(newComment);
        }
        this.newCommentText = '';
        this.replyTarget = null;
        this.isPosting = false;
      },
      error: () => {
        this.errorMessage = 'Gagal mengirim komentar. Coba lagi.';
        this.isPosting = false;
      }
    });
  }

  toggleUpvote(comment: Comment): void {
    if (!this.isAuthenticated) return;
    // Optimistic update
    const prevUpvotes = comment.upvotes;
    const prevHasUpvoted = comment.has_upvoted;
    comment.has_upvoted = !prevHasUpvoted;
    comment.upvotes = prevHasUpvoted ? prevUpvotes - 1 : prevUpvotes + 1;

    this.commentService.toggleUpvote(comment.id).subscribe({
      next: (res) => {
        comment.upvotes = res.upvotes;
        comment.has_upvoted = res.has_upvoted;
      },
      error: () => {
        // Rollback
        comment.upvotes = prevUpvotes;
        comment.has_upvoted = prevHasUpvoted;
      }
    });
  }

  setReplyTarget(comment: Comment): void {
    this.replyTarget = comment;
    this.newCommentText = '';
  }

  cancelReply(): void {
    this.replyTarget = null;
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  relativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 30) return `${diffDays} hari lalu`;
    return `${Math.floor(diffDays / 30)} bln lalu`;
  }

  get totalCommentCount(): number {
    return this.comments.length;
  }
}
