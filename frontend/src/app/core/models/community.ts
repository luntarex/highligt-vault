export type CommunityType = 'GAME' | 'USER';
export type CommunityStatus = 'PENDING_REVIEW' | 'AUTO_APPROVED' | 'NEEDS_MANUAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED' | 'APPEALED';
export type CommunityRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface Community {
  id: number;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  type: CommunityType;
  gameId?: number;
  founderId?: number;
  founderUsername?: string;
  moderationStatus?: CommunityStatus;
  moderationReason?: string;
  rules?: string;
  memberCount: number;
  postCount?: number;
  joined: boolean;
  viewerRole?: CommunityRole;
  createdAt?: string;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  rules?: string;
  thumbnailUrl?: string;
}
