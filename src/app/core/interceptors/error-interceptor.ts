
// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Error Interceptor - معالجة الأخطاء المركزية
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';

      if (error.error instanceof ErrorEvent) {
        errorMessage = `خطأ: ${error.error.message}`;
      } else {
        errorMessage = `كود الخطأ: ${error.status}\nالرسالة: ${error.message}`;

        switch (error.status) {
          case 401:
            router.navigate(['/auth/login']);
            errorMessage = 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً';
            break;

          case 403:
            router.navigate(['/unauthorized']);
            errorMessage = 'ليس لديك صلاحية للوصول لهذه الصفحة';
            break;

          case 404:
            errorMessage = 'المورد غير موجود';
            break;

          case 500:
            errorMessage = 'خطأ في الخادم، يرجى المحاولة لاحقاً';
            break;
        }
      }

      console.error(errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};
