export  interface Clip{
  id : number;
  title : string;
  game : string;
  notes: string;
  currentTime : number;
  startTime: number;
  endTime: number;
  thumbnailUrl : string;
  duration : number;
  tags : string[];
  dateCreated : Date;
  isFavorite : boolean;
  isDeleted : boolean;
  url : string;


}
