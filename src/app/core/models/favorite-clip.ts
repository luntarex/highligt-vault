import { Clip } from './clip';
export interface FavoriteClip extends Pick<Clip, 'id' | 'title' | 'game' | 'tags' | 'thumbnailUrl'> {
  durationFormatted: string;
  timeAgo: string;
}
