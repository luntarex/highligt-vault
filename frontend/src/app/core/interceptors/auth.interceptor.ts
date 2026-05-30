import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');
  if (!token || token === 'dummy') {
    return next(req);
  }
  if (isTokenExpired(token)) {
    clearStoredAuth();
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};

function isTokenExpired(token: string): boolean {
  try {
    const payloadPart = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payloadPart) {
      return true;
    }
    const payload = JSON.parse(atob(payloadPart));
    return !payload?.exp || Math.floor(Date.now() / 1000) >= Number(payload.exp);
  } catch {
    return true;
  }
}

function clearStoredAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  localStorage.removeItem('is_admin');
  localStorage.removeItem('profile_photo_url');
}
