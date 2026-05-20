import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegisterRequest, LoginRequest } from '../models/user';
import { Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';
  private userPhotoSubject = new BehaviorSubject<string>(localStorage.getItem('profile_photo_url') || '');
  public userPhoto$ = this.userPhotoSubject.asObservable();

  constructor(private http: HttpClient) { }

  login(request: LoginRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, request).pipe(
      tap((res: any) => {
        const userId = res.userId || res.id;
        if (res && userId) {
          localStorage.setItem('auth_token', res.token || '');
          localStorage.setItem('user_id', userId.toString());
          if (res.username) localStorage.setItem('username', res.username);
          const profilePhotoUrl = res.profilePhotoUrl || res.profile_photo_url;
          if (profilePhotoUrl) {
            localStorage.setItem('profile_photo_url', profilePhotoUrl);
            this.userPhotoSubject.next(profilePhotoUrl);
          }

          // Store the isAdmin flag
          if (res.isAdmin !== undefined) {
            localStorage.setItem('is_admin', res.isAdmin.toString());
          }
        }
      }),
      shareReplay(1)
    );
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, request);
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('profile_photo_url');
    this.userPhotoSubject.next('');
  }

  updatePhoto(url: string) {
    localStorage.setItem('profile_photo_url', url);
    this.userPhotoSubject.next(url);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token && token !== 'dummy';
  }

  isAdmin(): boolean {
    return localStorage.getItem('is_admin') === 'true' || localStorage.getItem('is_admin') === '1';
  }

  getCurrentUserId(): number {
    const tokenUserId = this.getUserIdFromToken();
    if (tokenUserId) {
      localStorage.setItem('user_id', tokenUserId.toString());
      return tokenUserId;
    }

    const id = localStorage.getItem('user_id');
    const parsedId = id ? parseInt(id, 10) : NaN;
    return Number.isFinite(parsedId) ? parsedId : 0;
  }

  private getUserIdFromToken(): number {
    const token = localStorage.getItem('auth_token');
    if (!token || token === 'dummy') return 0;

    try {
      const payloadPart = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (!payloadPart) return 0;
      const payload = JSON.parse(atob(payloadPart));
      const parsedId = payload?.sub ? parseInt(payload.sub, 10) : NaN;
      return Number.isFinite(parsedId) ? parsedId : 0;
    } catch {
      return 0;
    }
  }
}
