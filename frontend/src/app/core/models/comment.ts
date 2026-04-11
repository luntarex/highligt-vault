export interface Comment {
  id: number;
  postId: string;
  parentCommentId?: number;
  userId: number;
  content: string;
  timeAgo: string;
  isRemoved?: boolean;
}
