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
  companyName: string;
  currency: string;
  taxRate: number;
  logoUrl?: string;
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

  updateUserRole(userId: string, newRole: string): Observable<void> {
    return this.supabase.update('profiles', userId, { role: newRole }).pipe(
      map(() => void 0)
    );
  }

  deleteUser(id: string): Observable<void> {
    return from(
      this.supabase.client.from('profiles').delete().eq('id', id)
    ).pipe(map(() => void 0));
  }

  // ==================== الملف الشخصي (Profile) ====================

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
    return this.supabase.update('profiles', userId, data).pipe(
      map(() => void 0)
    );
  }

  // ==================== إعدادات النظام ====================

  getSystemSettings(): Observable<SystemConfig> {
    const saved = localStorage.getItem('dms_system_config');
    const defaultSettings: SystemConfig = {
      companyName: 'دار الزيبق للنشر',
      currency: 'USD',
      taxRate: 5
    };
    return of(saved ? JSON.parse(saved) : defaultSettings);
  }

  saveSystemSettings(settings: SystemConfig): Observable<void> {
    localStorage.setItem('dms_system_config', JSON.stringify(settings));
    return of(void 0);
  }
}
