import { inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap, finalize } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { QueryParams, PaginatedResponse } from '../models/base.model';

/**
 * Base Service - خدمة أساسية للعمليات CRUD
 * يمكن توريثها من قبل جميع الخدمات الأخرى
 */
@Injectable()
export abstract class BaseService<T> {
  protected supabase = inject(SupabaseService);

  // الجدول في قاعدة البيانات
  protected abstract tableName: string;

  // State Management
  protected items$ = new BehaviorSubject<T[]>([]);
  protected loading$ = new BehaviorSubject<boolean>(false);
  protected error$ = new BehaviorSubject<string | null>(null);

  // Observables للاستخدام في المكونات
  get items(): Observable<T[]> {
    return this.items$.asObservable();
  }

  get loading(): Observable<boolean> {
    return this.loading$.asObservable();
  }

  get error(): Observable<string | null> {
    return this.error$.asObservable();
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * GET ALL - جلب جميع السجلات
   */
  getAll(columns = '*'): Observable<T[]> {
    this.setLoading(true);

    return this.supabase.select<T>(this.tableName, columns).pipe(
      tap({
        next: (data) => {
          this.items$.next(data);
          this.clearError();
        },
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * GET BY ID - جلب سجل واحد
   */
  getById(id: string | number, idColumn = 'id'): Observable<T | null> {
    this.setLoading(true);

    return this.supabase.selectOne<T>(this.tableName, id, idColumn).pipe(
      tap({
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * GET WITH FILTER - جلب بتصفية
   */
  getFiltered(
    filter: { column: string; value: any; operator?: string },
    columns = '*'
  ): Observable<T[]> {
    this.setLoading(true);

    return this.supabase.select<T>(this.tableName, columns, filter).pipe(
      tap({
        next: (data) => {
          this.items$.next(data);
          this.clearError();
        },
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * GET PAGINATED - جلب بترقيم صفحات
   */
  getPaginated(params: QueryParams): Observable<PaginatedResponse<T>> {
    this.setLoading(true);

    const page = params.page || 1;
    const limit = params.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    return new Observable(observer => {
      let query = this.supabase.client
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .range(from, to);

      // Sorting
      if (params.sortBy) {
        query = query.order(params.sortBy, {
          ascending: params.sortOrder === 'asc'
        });
      }

      // Search (يحتاج تخصيص حسب الجدول)
      if (params.search && this.getSearchColumns().length > 0) {
        const searchColumns = this.getSearchColumns();
        const searchQuery = searchColumns
          .map(col => `${col}.ilike.%${params.search}%`)
          .join(',');
        query = query.or(searchQuery);
      }

      // Custom Filters
      if (params.filters) {
        Object.keys(params.filters).forEach(key => {
          const value = params.filters![key];
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }

      query.then(({ data, error, count }) => {
        if (error) {
          this.setError(error.message);
          observer.error(error);
        } else {
          const result: PaginatedResponse<T> = {
            data: data as T[],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          };

          this.items$.next(data as T[]);
          this.clearError();
          observer.next(result);
          observer.complete();
        }

        this.setLoading(false);
      });
    });
  }

  /**
   * CREATE - إنشاء سجل جديد
   */
  create(data: Partial<T>): Observable<T> {
    this.setLoading(true);

    return this.supabase.insert<T>(this.tableName, data).pipe(
      tap({
        next: (newItem) => {
          // إضافة للقائمة المحلية
          const currentItems = this.items$.value;
          this.items$.next([...currentItems, newItem]);
          this.clearError();
        },
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * UPDATE - تحديث سجل
   */
  update(id: string | number, data: Partial<T>, idColumn = 'id'): Observable<T> {
    this.setLoading(true);

    return this.supabase.update<T>(this.tableName, id, data, idColumn).pipe(
      tap({
        next: (updatedItem) => {
          // تحديث في القائمة المحلية
          const currentItems = this.items$.value;
          const index = currentItems.findIndex((item: any) => item[idColumn] === id);

          if (index !== -1) {
            currentItems[index] = updatedItem;
            this.items$.next([...currentItems]);
          }

          this.clearError();
        },
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  /**
   * DELETE - حذف سجل
   */
  delete(id: string | number, idColumn = 'id'): Observable<void> {
    this.setLoading(true);

    return this.supabase.delete(this.tableName, id, idColumn).pipe(
      tap({
        next: () => {
          // حذف من القائمة المحلية
          const currentItems = this.items$.value;
          this.items$.next(
            currentItems.filter((item: any) => item[idColumn] !== id)
          );
          this.clearError();
        },
        error: (error) => this.setError(error.message)
      }),
      finalize(() => this.setLoading(false))
    );
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * CREATE MANY - إنشاء عدة سجلات
   */
  createMany(items: Partial<T>[]): Observable<T[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        // FIX: تم استخدام (items as any) لتجاوز خطأ التايب سكريبت
        .insert(items as any)
        .select()
        .then(({ data, error }) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            const currentItems = this.items$.value;
            this.items$.next([...currentItems, ...(data as T[])]);
            this.clearError();
            observer.next(data as T[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * DELETE MANY - حذف عدة سجلات
   */
  deleteMany(ids: (string | number)[], idColumn = 'id'): Observable<void> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .delete()
        .in(idColumn, ids)
        .then(({ error }) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            const currentItems = this.items$.value;
            this.items$.next(
              currentItems.filter((item: any) => !ids.includes(item[idColumn]))
            );
            this.clearError();
            observer.next();
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  // ==================== UTILITIES ====================

  /**
   * REFRESH - إعادة تحميل البيانات
   */
  refresh(): Observable<T[]> {
    return this.getAll();
  }

  /**
   * CLEAR - مسح البيانات المحلية
   */
  clear(): void {
    this.items$.next([]);
    this.clearError();
  }

  /**
   * Search Columns - يجب تعريفها في كل Service
   * الأعمدة التي سيتم البحث فيها
   */
  protected getSearchColumns(): string[] {
    return [];
  }

  // ==================== STATE MANAGEMENT ====================

  protected setLoading(loading: boolean): void {
    this.loading$.next(loading);
  }

  protected setError(error: string): void {
    this.error$.next(error);
  }

  protected clearError(): void {
    this.error$.next(null);
  }

  // ==================== REALTIME ====================

  /**
   * Subscribe to realtime changes
   */
  subscribeToChanges(
    callback?: (payload: any) => void
  ): void {
    this.supabase.subscribeToTable(
      this.tableName,
      (payload) => {
        // تحديث القائمة المحلية
        const currentItems = this.items$.value;

        if (payload.eventType === 'INSERT') {
          this.items$.next([...currentItems, payload.new as T]);
        } else if (payload.eventType === 'UPDATE') {
          const index = currentItems.findIndex((item: any) => item.id === payload.new.id);
          if (index !== -1) {
            currentItems[index] = payload.new as T;
            this.items$.next([...currentItems]);
          }
        } else if (payload.eventType === 'DELETE') {
          this.items$.next(
            currentItems.filter((item: any) => item.id !== payload.old.id)
          );
        }

        // استدعاء callback إضافي إذا وجد
        if (callback) {
          callback(payload);
        }
      }
    );
  }
}
