import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Database {
  public: {
    Tables: {
      profiles: any;
      customers: any;
      suppliers: any;
      books: any;
      projects: any;
      project_tasks: any;
      invoices: any;
      expenses: any;
      [key: string]: any; // السماح بأي جدول آخر
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient<Database>;
  private currentUser$ = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient<Database>(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser$.next(session?.user ?? null);
    });

    this.loadSession();
  }

  private async loadSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.currentUser$.next(data.session?.user ?? null);
  }

  get currentUser(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  get currentUserValue(): User | null {
    return this.currentUser$.value;
  }

  // Expose client for advanced usage
  get client(): SupabaseClient<Database> {
    return this.supabase;
  }

  // ==================== AUTH ====================

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) throw error;
  }

  // ==================== DATABASE QUERIES ====================

  select<T = any>(
    table: string,
    columns = '*',
    filter?: { column: string; value: any; operator?: string }
  ): Observable<T[]> {
    // FIX: Cast to any to handle dynamic table names
    let query = (this.supabase.from(table) as any).select(columns);

    if (filter) {
      const operator = filter.operator || 'eq';
      query = (query as any)[operator](filter.column, filter.value);
    }

    return from(query).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
        return response.data as T[];
      })
    );
  }

  selectOne<T = any>(
    table: string,
    id: string | number,
    idColumn = 'id'
  ): Observable<T | null> {
    return from(
      (this.supabase.from(table) as any)
        .select('*')
        .eq(idColumn, id)
        .single()
    ).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
        return response.data as T;
      })
    );
  }

  insert<T = any>(table: string, data: any): Observable<T> {
    return from(
      (this.supabase.from(table) as any)
        .insert(data)
        .select()
        .single()
    ).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
        return response.data as T;
      })
    );
  }

  update<T = any>(
    table: string,
    id: string | number,
    data: any,
    idColumn = 'id'
  ): Observable<T> {
    return from(
      (this.supabase.from(table) as any)
        .update(data)
        .eq(idColumn, id)
        .select()
        .single()
    ).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
        return response.data as T;
      })
    );
  }

  delete(table: string, id: string | number, idColumn = 'id'): Observable<void> {
    return from(
      (this.supabase.from(table) as any)
        .delete()
        .eq(idColumn, id)
    ).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
      })
    );
  }

  rpc<T = any>(functionName: string, params?: any): Observable<T> {
    return from(this.supabase.rpc(functionName, params)).pipe(
      map((response: any) => {
        if (response.error) throw response.error;
        return response.data as T;
      })
    );
  }

  // ==================== STORAGE ====================

  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: { cacheControl?: string; upsert?: boolean }
  ): Promise<{ path: string; url: string }> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false
      });

    if (error) throw error;

    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl
    };
  }

  async downloadFile(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  }

  async deleteFile(bucket: string, paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) throw error;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // ==================== REALTIME ====================

  subscribeToTable<T = any>(
    table: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: T;
      old: T;
    }) => void
  ) {
    return this.supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback as any
      )
      .subscribe();
  }

  executeSql<T = any>(query: string, params?: any): Observable<T[]> {
    return this.rpc('execute_sql', { query, params });
  }

  getCurrentUserProfile<T = any>(): Observable<T | null> {
    const userId = this.currentUserValue?.id;
    if (!userId) return from([null]);

    return this.selectOne<T>('profiles', userId);
  }

  async hasRole(role: string): Promise<boolean> {
    const userId = this.currentUserValue?.id;
    if (!userId) return false;

    // FIX: Cast the query result to any to avoid 'never' type error
    const { data, error } = await (this.supabase
      .from('profiles') as any)
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    // Now data is treated as any, so .role access is allowed
    return data.role === role || data.role === 'admin';
  }
}
