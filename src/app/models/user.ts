export interface User {
    id: string;
    username: string;
    email: string;
    profilePhotoUrl:string;
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
