// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'accountant' | 'data_entry' | 'employee' | 'freelancer' | 'client';
  phone?: string;
  avatar_url?: string;
  email?: string;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  constructor() {
    this.initializeAuth();
  }

  // ==================== STATE ====================

  get state$(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  get currentUser(): UserProfile | null {
    return this.authState$.value.user;
  }

  get isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  get userRole(): string | null {
    return this.currentUser?.role || null;
  }

  // ==================== INITIALIZATION ====================

  private initializeAuth(): void {
    this.supabase.currentUser
      .pipe(
        switchMap(user => {
          if (!user) {
            return of(null);
          }
          return this.loadUserProfile(user.id);
        })
      )
      .subscribe({
        next: (profile) => {
          this.authState$.next({
            isAuthenticated: !!profile,
            user: profile,
            loading: false
          });
        },
        error: () => {
          this.authState$.next({
            isAuthenticated: false,
            user: null,
            loading: false
          });
        }
      });
  }

  // ==================== AUTH METHODS ====================

  signIn(email: string, password: string): Observable<UserProfile> {
    this.setLoading(true);

    return from(this.supabase.signIn(email, password)).pipe(
      switchMap(() => {
        const userId = this.supabase.currentUserValue?.id;
        if (!userId) throw new Error('User ID not found');
        return this.loadUserProfile(userId);
      }),
      tap(profile => {
        this.authState$.next({
          isAuthenticated: true,
          user: profile,
          loading: false
        });
      }),
      catchError(error => {
        this.setLoading(false);
        throw error;
      })
    );
  }

  signUp(
    email: string,
    password: string,
    fullName: string,
    role: UserProfile['role'] = 'employee'
  ): Observable<UserProfile> {
    this.setLoading(true);

    return from(
      this.supabase.signUp(email, password, { full_name: fullName })
    ).pipe(
      switchMap(({ user }) => {
        if (!user) throw new Error('User creation failed');

        return this.supabase.insert<UserProfile>('profiles', {
          id: user.id,
          full_name: fullName,
          role: role,
          created_at: new Date().toISOString()
        });
      }),
      tap(profile => {
        this.authState$.next({
          isAuthenticated: true,
          user: profile,
          loading: false
        });
      }),
      catchError(error => {
        this.setLoading(false);
        throw error;
      })
    );
  }

  signOut(): Observable<void> {
    return from(this.supabase.signOut()).pipe(
      tap(() => {
        this.authState$.next({
          isAuthenticated: false,
          user: null,
          loading: false
        });
        this.router.navigate(['/auth/login']);
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(this.supabase.resetPassword(email));
  }

  updatePassword(newPassword: string): Observable<void> {
    return from(
      this.supabase.client.auth.updateUser({ password: newPassword })
    ).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
      })
    );
  }

  // ==================== PROFILE ====================

  private loadUserProfile(userId: string): Observable<UserProfile> {
    return this.supabase.selectOne<UserProfile>('profiles', userId).pipe(
      map(profile => {
        if (!profile) throw new Error('Profile not found');
        return profile;
      })
    );
  }

  updateProfile(updates: Partial<UserProfile>): Observable<UserProfile> {
    const userId = this.currentUser?.id;
    if (!userId) throw new Error('User not authenticated');

    return this.supabase.update<UserProfile>('profiles', userId, updates).pipe(
      tap(profile => {
        this.authState$.next({
          ...this.authState$.value,
          user: profile
        });
      })
    );
  }

  async uploadAvatar(file: File): Promise<string> {
    const userId = this.currentUser?.id;
    if (!userId) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { url } = await this.supabase.uploadFile('avatars', filePath, file, {
      upsert: true
    });

    await this.updateProfile({ avatar_url: url }).toPromise();

    return url;
  }

  // ==================== ROLE CHECKS ====================

  hasRole(roles: string | string[]): boolean {
    if (!this.currentUser) return false;

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(this.currentUser.role) || this.currentUser.role === 'admin';
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isManager(): boolean {
    return this.hasRole(['admin', 'manager']);
  }

  isAccountant(): boolean {
    return this.hasRole(['admin', 'accountant']);
  }

  isFreelancer(): boolean {
    return this.currentUser?.role === 'freelancer';
  }

  isClient(): boolean {
    return this.currentUser?.role === 'client';
  }

  // ==================== UTILITIES ====================

  private setLoading(loading: boolean): void {
    this.authState$.next({
      ...this.authState$.value,
      loading
    });
  }

  async checkSession(): Promise<boolean> {
    try {
      const { data } = await this.supabase.client.auth.getSession();
      return !!data.session;
    } catch {
      return false;
    }
  }

  async refreshSession(): Promise<void> {
    const { error } = await this.supabase.client.auth.refreshSession();
    if (error) throw error;
  }

  /**
   * Get all users (Admin only)
   */
  getAllUsers(): Observable<UserProfile[]> {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
    return this.supabase.select<UserProfile>('profiles', '*');
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: UserProfile['role']): Observable<UserProfile[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('profiles')
        .select('*')
        .eq('role', role)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as UserProfile[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Update user role (Admin only)
   */
  updateUserRole(userId: string, newRole: UserProfile['role']): Observable<UserProfile> {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
    return this.supabase.update<UserProfile>('profiles', userId, { role: newRole });
  }

  /**
   * Deactivate user (Admin only)
   */
  async deactivateUser(userId: string): Promise<void> {
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }
    // يحتاج RPC function لتعطيل المستخدم في Auth
    await this.supabase.rpc('deactivate_user', { user_id: userId }).toPromise();
  }
}
