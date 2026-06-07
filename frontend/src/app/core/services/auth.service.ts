import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { RegisterRequest, LoginRequest } from '../models/user';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${API_BASE_URL}/auth`;
  private usersUrl = `${API_BASE_URL}/users`;
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
    if (!token || token === 'dummy') {
      return false;
    }
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && (localStorage.getItem('is_admin') === 'true' || localStorage.getItem('is_admin') === '1');
  }

  validateCurrentUserExists(): Observable<boolean> {
    if (!this.isLoggedIn()) {
      return of(false);
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      this.logout();
      return of(false);
    }

    return this.http.get(`${this.usersUrl}/${userId}`).pipe(
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        if ([401, 403, 404].includes(error.status)) {
          this.logout();
          return of(false);
        }
        return of(true);
      })
    );
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
    if (this.isTokenExpired(token)) {
      this.logout();
      return 0;
    }

    try {
      const payload = this.getTokenPayload(token);
      const parsedId = payload?.sub ? parseInt(payload.sub, 10) : NaN;
      return Number.isFinite(parsedId) ? parsedId : 0;
    } catch {
      return 0;
    }
  }

  isTokenExpired(token = localStorage.getItem('auth_token')): boolean {
    const payload = this.getTokenPayload(token);
    if (!payload?.exp) {
      return true;
    }
    return Math.floor(Date.now() / 1000) >= Number(payload.exp);
  }

  private getTokenPayload(token: string | null): any | null {
    if (!token || token === 'dummy') {
      return null;
    }

    try {
      const payloadPart = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (!payloadPart) {
        return null;
      }
      return JSON.parse(atob(payloadPart));
    } catch {
      return null;
    }
  }
}

