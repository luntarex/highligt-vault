import { User } from "./user";
export interface ExplorePost {
  id: string;
  author: Pick<User, 'id' | 'username' | 'profilePhotoUrl'>;
  title: string;
  videoUrl: string;
  game: string;
  likes: number;
  comments: number;
  views?: number;
  favorites?: number;
  isLiked: boolean;
  timeAgo?: string;
  createdAt?: string;
  tags: string[];
  currentTime?: number;
  duration?: number;
  startTime?: number;
  endTime?: number;
  clipId?: string;
  communityId?: string;
  communityName?: string;
  postType?: 'CLIP' | 'TEXT';
  isFavorited?: boolean;
  originalPost?: ExplorePost;
  repostType?: string;
}
