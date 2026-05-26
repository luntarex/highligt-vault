import { Clip } from './clip';

export interface ClipGroup {
  id: number;
  userId: number;
  name: string;
  description?: string;
  createdAt?: string | Date;
  clipCount?: number;
  type?: 'LIBRARY' | 'FAVORITES' | string;
  thumbnailUrl?: string;
  clips?: Clip[];
}
