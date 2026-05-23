import { Clip } from './clip';

export interface ClipGroup {
    id: number;
    userId: number;
    name: string;
    description: string;
    createdAt: string;
    type?: string;
    thumbnailUrl?: string;
    clips?: Clip[];
}
