// src/app/features/settings/settings.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';

import { SupabaseService } from '../../core/services/supabase.service';
import { UserProfile } from '../../core/services/auth.service';
import { map } from 'rxjs/operators'; // تأكد من استيراد map
export interface UserManagementItem {
  id: string;
  full_name: string;
  email?: string;
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
/**
   * جلب قائمة المستخدمين (كـ Observable)
   */
  getUsersList(): Observable<UserManagementItem[]> {
    // استخدام from لتحويل الـ Promise إلى Observable ليقبل الـ subscribe
    return from(
      this.supabase.client
        .from('profiles')
        .select('*')
        .then(({ data, error }) => {
          if (error) throw error;
          return data as UserManagementItem[];
        })
    );
  }
  // دالة للحذف (اختياري)
  deleteUser(id: string): Observable<any> {
      return from(
          this.supabase.client.from('profiles').delete().eq('id', id)
      );
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
