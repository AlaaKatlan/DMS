// src/app/core/guards/guest.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, AuthState } from '../services/auth.service';
import { map } from 'rxjs/operators';

/**
 * Guest Guard - منع الوصول لصفحات Auth إذا المستخدم مسجل دخول
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map((state: AuthState) => {
      if (state.loading) {
        return false;
      }

      if (state.isAuthenticated) {
        router.navigate(['/dashboard']);
        return false;
      }

      return true;
    })
  );
};
