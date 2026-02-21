export interface User {
    id: string;
    username: string;
    email: string;
    description:string;
    profilePhotoUrl:string;
    createdAt:Date;
    
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
