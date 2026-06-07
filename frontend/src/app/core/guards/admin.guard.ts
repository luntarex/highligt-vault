import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (!this.authService.isLoggedIn()) {
      return this.router.parseUrl('/welcome');
    }

    return this.authService.validateCurrentUserExists().pipe(
      map(isValid => {
        if (!isValid) {
          return this.router.parseUrl('/welcome');
        }
        return this.authService.isAdmin() ? true : this.router.parseUrl('/');
      })
    );
  }
}
