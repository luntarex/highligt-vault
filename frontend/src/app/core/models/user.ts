export interface User {
    id: number;
    username: string;
    email: string;
    description:string;
    profilePhotoUrl:string;
    createdAt:Date;
    isAdmin:boolean;
    totalClips?: number;
    totalFavorites?: number;
}
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
