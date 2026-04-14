import { Clip } from './clip';

export interface Playlist {
  id: number;
  userId: number;
  name: string;
  description?: string;
  createdAt?: string | Date;
  clips?: Clip[];
}
