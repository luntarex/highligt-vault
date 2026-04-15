import { User } from "./user";
export interface ExplorePost {
  id: string;
  author: Pick<User, 'id' | 'username' | 'profilePhotoUrl'>;
  title: string;
  videoUrl: string;
  game: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  timeAgo: string;
  tags: string[];
  currentTime?: number;
  duration?: number;
  startTime?: number;
  endTime?: number;
  clipId?: string;
  isFavorited?: boolean;
}

