
// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService, AuthState } from '../services/auth.service';
import { map } from 'rxjs/operators';

/**
 * Role Guard - حماية الصفحات حسب الدور
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];

  return authService.state$.pipe(
    map((state: AuthState) => {
      if (state.loading) {
        return false;
      }

      if (!state.isAuthenticated) {
        router.navigate(['/auth/login']);
        return false;
      }

      const hasPermission = authService.hasRole(requiredRoles);

      if (!hasPermission) {
        router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    })
  );
};
