import { User } from "./user";

export interface UserProfile extends Omit<User,"id" | "email" | "createdAt"> {
totalClips: number;
totalFavorites: number;
}
