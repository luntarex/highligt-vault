import { Injectable } from '@angular/core';
import { RegisterRequest, LoginRequest } from '../models/user';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  login(request: LoginRequest): Observable<boolean> {
    // In a real app, this would make an HTTP POST request to the backend
    console.log('AuthService: Logging in with', request);
    // Mock successful login
    return of(true);
  }

  register(request: RegisterRequest): Observable<boolean> {
     // In a real app, this would make an HTTP POST request to the backend
    console.log('AuthService: Registering with', request);
    // Mock successful registration
    return of(true);
  }

  logout(): void {
    console.log('AuthService: Logging out');
  }

  isLoggedIn(): boolean {
    // Mock logic: currently always true for demonstration
    return true; 
  }

  isAdmin(): boolean {
    // Mock logic: currently always return true so admin features can be tested
    return true;
  }
}
