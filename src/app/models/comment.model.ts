export interface CommentUser {
  id: string;
  display_name: string;
  picture_url: string | null;
}

export interface Comment {
  id: string;
  user: CommentUser;
  body: string;
  is_admin_pin: boolean;
  upvotes: number;
  has_upvoted: boolean;
  reply_count: number;
  created_at: string;
  // UI state (tidak dari server)
  replies?: Comment[];
  showReplies?: boolean;
  loadingReplies?: boolean;
}

export interface CommentListResponse {
  data: Comment[];
  total: number;
  page: number;
}
