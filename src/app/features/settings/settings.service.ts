import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../core/services/supabase.service';

export interface UserManagementItem {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  avatar_url?: string;
  phone?: string;
}

export interface SystemConfig {
  id?: string;
  company_name: string;
  currency: string;
  logo_url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private supabase = inject(SupabaseService);

  // ==================== إدارة المستخدمين ====================

  getUsersList(): Observable<UserManagementItem[]> {
    return from(
      this.supabase.client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data as UserManagementItem[];
        })
    );
  }

  createUser(user: any): Observable<void> {
    console.log('Creating user logic needs Supabase Edge Function', user);
    return of(void 0);
  }

  updateUserFull(userId: string, data: Partial<UserManagementItem>): Observable<void> {
    return from(
      // ✅ الحل: تحويل (from) إلى (any) ليقبل دالة update بدون قيود
      (this.supabase.client.from('profiles') as any)
        .update(data)
        .eq('id', userId)
    ).pipe(
      map(({ error }: any) => { // تمت إضافة النوع للمتغير error
        if (error) throw error;
      })
    );
  }

  updateUserRole(userId: string, newRole: string): Observable<void> {
    return from(
      // ✅ الحل: نفس الطريقة هنا
      (this.supabase.client.from('profiles') as any)
        .update({ role: newRole })
        .eq('id', userId)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
      })
    );
  }

  deleteUser(id: string): Observable<void> {
    return from(
      this.supabase.client.from('profiles').delete().eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }

  // ==================== الملف الشخصي ====================

  getProfile(userId: string): Observable<UserManagementItem> {
    return from(
      this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data as UserManagementItem;
        })
    );
  }

  updateProfile(userId: string, data: Partial<UserManagementItem>): Observable<void> {
    return from(
      // ✅ الحل: وهنا أيضاً
      (this.supabase.client.from('profiles') as any)
        .update(data)
        .eq('id', userId)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
      })
    );
  }

  // ==================== إعدادات النظام (System Settings) ====================

  getSystemSettings(): Observable<SystemConfig> {
    return from(
      (this.supabase.client as any)
        .from('system_settings')
        .select('*')
        .single()
        .then(({ data, error }: any) => {
          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          if (!data) {
            return { company_name: 'دار الزيبق', currency: 'USD' } as SystemConfig;
          }
          return data as SystemConfig;
        }) as Promise<SystemConfig>
    );
  }

  saveSystemSettings(settings: SystemConfig): Observable<void> {
    const { id, ...payload } = settings;

    return from(
      (this.supabase.client as any)
        .from('system_settings')
        .upsert(payload)
        .select()
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
      })
    );
  }
}
