// src/app/features/dashboard/dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import { DashboardStats, Expense, Invoice, InvoicePayment, Project, ProjectTask } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase = inject(SupabaseService);

  /**
   * Get all dashboard statistics
   */
  getDashboardStats(): Observable<DashboardStats> {
    return forkJoin({
      todayRevenue: this.getTodayRevenue(),
      monthlyRevenue: this.getMonthlyTotalRevenue(),
      monthlyExpenses: this.getMonthlyTotalExpenses(),
      projects: this.getProjectStats(),
      tasks: this.getTaskStats(),
      invoices: this.getInvoiceStats(),
      books: this.getBookStats()
    }).pipe(
      map(data => ({
        todayRevenue: data.todayRevenue,
        monthlyRevenue: data.monthlyRevenue,
        monthlyExpenses: data.monthlyExpenses,
        monthlyProfit: data.monthlyRevenue - data.monthlyExpenses,
        activeProjects: data.projects.active,
        overdueProjects: data.projects.overdue,
        pendingTasks: data.tasks.pending,
        overdueTasks: data.tasks.overdue,
        lowStockBooks: data.books.lowStock,
        pendingInvoices: data.invoices.pending,
        overdueInvoices: data.invoices.overdue
      }))
    );
  }

  /**
   * Today's revenue from invoice payments
   */
private getTodayRevenue(): Observable<number> {
  const today = new Date().toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('invoice_payments')
      .select('*')                         // ✔️ هون منجيب كل الحقول
      .gte('paid_at', today)
      .returns<InvoicePayment[]>()         // ✔️ وهون منحكي للـ TS شو النوع الصحيح
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
        } else {
          const total =
            data?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

          observer.next(total);
          observer.complete();
        }
      });
  });
}


  /**
   * Monthly revenue
   */
 private getMonthlyTotalRevenue(): Observable<number> {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('invoice_payments')
      .select('*')                        // ✔️ لازم يكون String فقط — بدون Generics
      .gte('paid_at', firstDay)
      .returns<InvoicePayment[]>()        // ✔️ هنا يتم تحديد نوع البيانات
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
        } else {
          const total =
            data?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

          observer.next(total);
          observer.complete();
        }
      });
  });
}


  /**
   * Monthly expenses
   */
private getMonthlyTotalExpenses(): Observable<number> {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('expenses')
      .select('*')                           // ✔️ Supabase V2 requires string only
      .eq('approved', true)
      .gte('expense_date', firstDay)
      .returns<Expense[]>()                  // ✔️ TypeScript now knows each item is Expense
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
        } else {
          const total =
            data?.reduce((sum, e) => sum + (e.amount ?? 0), 0) ?? 0;

          observer.next(total);
          observer.complete();
        }
      });
  });
}

  /**
   * Project statistics
   */
private getProjectStats(): Observable<{ active: number; overdue: number }> {
  const today = new Date().toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('projects')
      .select('*')
      .returns<Project[]>()
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
          return;
        }

        const projects = data ?? [];

        const active = projects.filter(p => p.status === 'active').length;

        const overdue = projects.filter(p =>
          p.status === 'active' &&
          p.due_date &&
          p.due_date < today
        ).length;

        observer.next({ active, overdue });
        observer.complete();
      });
  });
}


  /**
   * Task statistics
   */
 private getTaskStats(): Observable<{ pending: number; overdue: number }> {
  const today = new Date().toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('project_tasks')
      .select('*')                        // ✔️ Supabase V2 correct usage
      .returns<ProjectTask[]>()           // ✔️ Proper typing
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
          return;
        }

        const tasks = data ?? [];

        const pending =
          tasks.filter(t =>
            t.status === 'todo' || t.status === 'in_progress'
          ).length;

        const overdue =
          tasks.filter(t =>
            (t.status === 'todo' || t.status === 'in_progress') &&
            t.due_date &&
            t.due_date < today
          ).length;

        observer.next({ pending, overdue });
        observer.complete();
      });
  });
}


  /**
   * Invoice statistics
   */
private getInvoiceStats(): Observable<{ pending: number; overdue: number }> {
  const today = new Date().toISOString().split('T')[0];

  return new Observable(observer => {
    this.supabase.client
      .from('invoices')
      .select('*')                        // ✔️ Supabase V2 correct usage
      .returns<Invoice[]>()               // ✔️ Typed result for TS
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
          return;
        }

        const invoices = data ?? [];

        const pending =
          invoices.filter(i =>
            i.status === 'unpaid' || i.status === 'partially_paid'
          ).length;

        const overdue =
          invoices.filter(i =>
            (i.status === 'unpaid' || i.status === 'partially_paid') &&
            i.due_date &&
            i.due_date < today
          ).length;

        observer.next({ pending, overdue });
        observer.complete();
      });
  });
}


  /**
   * Book statistics
   */
  private getBookStats(): Observable<{ lowStock: number }> {
    return new Observable(observer => {
      // يحتاج دالة RPC أو حساب المخزون
      // مؤقتاً نرجع 0
      observer.next({ lowStock: 0 });
      observer.complete();
    });
  }

  /**
   * Monthly revenue data for chart (last 12 months)
   */
  getMonthlyRevenue(): Observable<{ month: string; amount: number }[]> {
    return this.supabase.rpc('get_monthly_revenue_chart', {});
  }

  /**
   * Top selling books
   */
  getTopBooks(limit: number = 5): Observable<any[]> {
    return this.supabase.rpc('get_top_books', { limit_count: limit });
  }

  /**
   * Recent activities
   */
getRecentActivities(limit: number = 10): Observable<{
  description: string;
  time: string;
  type: string;
  icon: string;
}[]> {
  return new Observable(observer => {
    this.supabase.client
      .from('activity_log')
      .select(`
        *,
        actor:profiles(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<any[]>()  // 👈 تحديد نوع البيانات لتجنب TS errors
      .then(({ data, error }) => {
        if (error) {
          observer.error(error);
          return;
        }

        const activities = data?.map(log => ({
          description: this.formatActivity(log),
          time: this.formatTime(log.created_at),
          type: this.getActivityType(log.action),
          icon: this.getActivityIcon(log.action),
        })) || [];

        observer.next(activities);
        observer.complete();
      });
  });
}


  /**
   * Format activity description
   */
  private formatActivity(log: any): string {
    const actor = log.actor?.full_name || 'مستخدم';
    const action = this.getActionText(log.action);
    const table = this.getTableName(log.table_name);

    return `${actor} ${action} ${table}`;
  }

  /**
   * Get action text in Arabic
   */
  private getActionText(action: string): string {
    const actions: any = {
      'created': 'أنشأ',
      'updated': 'عدّل',
      'deleted': 'حذف'
    };
    return actions[action] || action;
  }

  /**
   * Get table name in Arabic
   */
  private getTableName(table: string): string {
    const tables: any = {
      'customers': 'عميل',
      'projects': 'مشروع',
      'invoices': 'فاتورة',
      'books': 'كتاب',
      'tasks': 'مهمة'
    };
    return tables[table] || table;
  }

  /**
   * Format time (relative)
   */
  private formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return date.toLocaleDateString('ar-SA');
  }

  /**
   * Get activity type for styling
   */
  private getActivityType(action: string): string {
    const types: any = {
      'created': 'success',
      'updated': 'info',
      'deleted': 'warning'
    };
    return types[action] || 'info';
  }

  /**
   * Get activity icon
   */
  private getActivityIcon(action: string): string {
    const icons: any = {
      'created': 'plus',
      'updated': 'edit',
      'deleted': 'trash'
    };
    return icons[action] || 'activity';
  }
}
