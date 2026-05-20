import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { getSafeErrorMessage } from '../utils/error-message';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
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
