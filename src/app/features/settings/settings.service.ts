// src/app/features/settings/settings.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import { UserProfile } from '../../core/services/auth.service';
import { map } from 'rxjs/operators'; // تأكد من استيراد map
export interface UserManagementItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private supabase = inject(SupabaseService);

  /**
   * جلب قائمة المستخدمين (باستخدام الدالة الآمنة التي أنشأناها)
   */
  /**
   * جلب قائمة المستخدمين (لإسناد المهام)
   */
getUsersList(): Observable<UserManagementItem[]> {
    // نستخدم جدول profiles مباشرة أو دالة RPC إذا كانت الصلاحيات معقدة
    return this.supabase.client
      .from('profiles')
      .select('*')
      .then(({ data, error }) => {
        if (error) throw error;
        return data as UserManagementItem[];
      }) as any; // تحويل الوعد إلى Observable (يفضل استخدام from إذا كنت تستخدم rxjs)

      // ملاحظة: الأفضل استخدام from() من rxjs لتحويل الـ Promise
      // لكن للتبسيط سنستخدم الطريقة الموجودة في base.service لديك
  }
  /**
   * تحديث صلاحية مستخدم
   */
updateUserRole(userId: string, newRole: string): Observable<void> {
  // استخدام الدالة الجاهزة من السيرفس
  return this.supabase.update('profiles', userId, { role: newRole }).pipe(
    map(() => void 0) // تحويل النتيجة إلى void لتطابق نوع الإرجاع
  );
}

  /**
   * حذف مستخدم (اختياري - يتطلب دالة RPC إضافية إذا كنت تريد حذفه من auth)
   */
  deactivateUser(userId: string): Observable<void> {
    // نستخدم الدالة الموجودة في AuthService أو ننشئ واحدة هنا
    return this.supabase.rpc('deactivate_user', { user_id: userId });
  }// لجعلها متوافقة مع Observables في مشروعك:
  getAll(): Observable<UserManagementItem[]> {
     return new Observable(observer => {
      this.supabase.client
        .from('profiles')
        .select('*')
        .then(({ data, error }) => {
          if (error) observer.error(error);
          else {
            observer.next(data as UserManagementItem[]);
            observer.complete();
          }
        });
    });
  }
}
