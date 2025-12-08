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
  getUsersList(): Observable<UserManagementItem[]> {
    return this.supabase.rpc('get_users_management_list', {});
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
  }
}
