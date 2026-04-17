export interface Comment {
  id: number;
  postId: string;
  parentCommentId?: number;
  userId: number;
  content: string;
  timeAgo: string;
  username: string;
  profilePhoto?: string;
  isRemoved?: boolean;
  cleanText?: string;
  replyTargetUsername?: string;
}
