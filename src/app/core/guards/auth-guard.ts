// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, AuthState } from '../services/auth.service';
import { map } from 'rxjs/operators';

/**
 * Auth Guard - حماية الصفحات التي تحتاج تسجيل دخول
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map((state: AuthState) => {
      if (state.loading) {
        return false;
      }

      if (state.isAuthenticated) {
        return true;
      }

      router.navigate(['/auth/login']);
      return false;
    })
  );
};
