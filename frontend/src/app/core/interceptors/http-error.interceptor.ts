import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { getSafeErrorMessage } from '../utils/error-message';
import { AuthService } from '../services/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRoute(req.url)) {
        authService.logout();
        router.navigate(['/welcome']);
      }

      const safeMessage = getSafeErrorMessage(error);
      const sanitizedError = new HttpErrorResponse({
        error: { message: safeMessage },
        headers: error.headers,
        status: error.status,
        statusText: error.statusText,
        url: error.url || undefined
      });
      return throwError(() => sanitizedError);
    })
  );
};

function isAuthRoute(url: string): boolean {
  return /\/auth\/(login|register)(?:$|[/?#])/i.test(url);
}
