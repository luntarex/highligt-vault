export  interface Clip{
  id : number;
  title : string;
  game : string;
  notes: string;
  tags : string[];
  url : string;
  cloudinaryPublicId?: string;
  fileHash?: string;
  thumbnailUrl : string;

  /*Editor Time Logic */
  duration : number;
  currentTime : number;
  startTime: number;
  endTime: number;

  //Relationship & State
  uploaderId : number
  isFavorite : boolean;
  isDeleted : boolean;
  visibilityStatus: 'PRIVATE' | 'PUBLIC' | 'LIMITED' | 'HIDDEN' | 'REMOVED';
  moderationStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'AUTO_APPROVED' | 'NEEDS_MANUAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED' | 'APPEALED';
  moderationScore?: number;
  moderationReason?: string;
  removedReason?: string;
  viewCount?: number;

  dateCreated : Date;

}
