import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject('BASE_API_URL') baseApiUrl: string
  ) {
    this.baseUrl = baseApiUrl;
  }

  getComments(questionId: number, page: number = 1): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.baseUrl}/questions/${questionId}/comments?page=${page}&limit=20`
    );
  }

  getReplies(questionId: number, commentId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.baseUrl}/questions/${questionId}/comments/${commentId}/replies`
    );
  }

  postComment(questionId: number, body: string, parentId?: string): Observable<Comment> {
    return this.http.post<Comment>(
      `${this.baseUrl}/questions/${questionId}/comments`,
      { body, parent_id: parentId ?? null }
    );
  }

  toggleUpvote(commentId: string): Observable<{ upvotes: number; has_upvoted: boolean }> {
    return this.http.post<{ upvotes: number; has_upvoted: boolean }>(
      `${this.baseUrl}/comments/${commentId}/upvote`,
      {}
    );
  }
}
