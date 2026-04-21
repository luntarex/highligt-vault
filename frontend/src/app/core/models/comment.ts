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
  postTitle?: string;
  postThumbnail?: string;
  postVideoUrl?: string;
  postDuration?: number;
  postStartTime?: number;
  postEndTime?: number;
  postGameName?: string;
  postAuthorName?: string;
  postAuthorPhoto?: string;
  postAuthorId?: number;
}
