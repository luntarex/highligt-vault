export  interface Clip{
  id : number;
  title : string;
  game : string;
  notes: string;
  tags : string[];
  url : string;
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
  isPublic : boolean;

  dateCreated : Date;

}
