// src/app/features/dashboard/dashboard.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, forkJoin, map } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import { DashboardStats } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private supabase = inject(SupabaseService);

  /**
   * جلب جميع إحصائيات لوحة التحكم دفعة واحدة
   */
  getDashboardStats(): Observable<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return forkJoin({
      // 1. إيرادات اليوم (مبيعات كتب + فواتير مشاريع مدفوعة)
      todayBookSales: from(this.supabase.client
        .from('sales_invoices')
        .select('total')
        .eq('sale_date', today)
      ),

      // 2. إيرادات الشهر (كتب + مشاريع)
      monthlyBookSales: from(this.supabase.client
        .from('sales_invoices')
        .select('total, sale_date')
        .gte('sale_date', startOfMonth)
      ),
      monthlyProjectInvoices: from(this.supabase.client
        .from('invoices')
        .select('amount_due')
        .eq('status', 'paid')
        .gte('issue_date', startOfMonth)
      ),

      // 3. المصاريف الشهرية
      monthlyExpenses: from(this.supabase.client
        .from('expenses')
        .select('amount')
        .gte('expense_date', startOfMonth)
      ),

      // 4. إحصائيات المشاريع
      activeProjects: from(this.supabase.client
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
      ),

      // 5. إحصائيات المهام
      pendingTasks: from(this.supabase.client
        .from('project_tasks')
        .select('id', { count: 'exact' })
        .neq('status', 'completed')
      ),

      // 6. الكتب منخفضة المخزون
      lowStockBooks: from(this.supabase.client
        .from('books')
        .select('book_id', { count: 'exact' })
        .lt('stock_quantity', 10)
      ),

      // 7. الفواتير المعلقة والمتأخرة (لحل مشكلة الـ Type Error)
      pendingInvoices: from(this.supabase.client
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('status', 'unpaid')
      ),
      overdueInvoices: from(this.supabase.client
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('status', 'overdue') // أو استخدام شرط التاريخ < اليوم
      )

    }).pipe(
      map(results => {
        // --- تصحيح الأخطاء باستخدام (as any[]) ---

        // إيرادات اليوم
        const todayBookData = (results.todayBookSales.data as any[]) || [];
        const todayRevenue = todayBookData.reduce((sum, item) => sum + (item.total || 0), 0);

        // إيرادات الشهر
        const monthlyBookData = (results.monthlyBookSales.data as any[]) || [];
        const monthlyProjData = (results.monthlyProjectInvoices.data as any[]) || [];

        const monthlyBookRev = monthlyBookData.reduce((sum, item) => sum + (item.total || 0), 0);
        const monthlyProjRev = monthlyProjData.reduce((sum, item) => sum + (item.amount_due || 0), 0);
        const totalMonthlyRevenue = monthlyBookRev + monthlyProjRev;

        // المصاريف
        const expensesData = (results.monthlyExpenses.data as any[]) || [];
        const totalExpenses = expensesData.reduce((sum, item) => sum + (item.amount || 0), 0);

        // بناء الكائن النهائي مع كافة الحقول المطلوبة
        return {
          todayRevenue: todayRevenue,
          monthlyRevenue: totalMonthlyRevenue,
          monthlyExpenses: totalExpenses,
          monthlyProfit: totalMonthlyRevenue - totalExpenses,
          activeProjects: results.activeProjects.count || 0,
          overdueProjects: 0,
          pendingTasks: results.pendingTasks.count || 0,
          overdueTasks: 0,
          lowStockBooks: results.lowStockBooks.count || 0,
          customerCount: 0,
          // إضافة الحقول الناقصة
          pendingInvoices: results.pendingInvoices.count || 0,
          overdueInvoices: results.overdueInvoices.count || 0
        } as DashboardStats;
      })
    );
  }

  /**
   * جلب بيانات الرسم البياني للإيرادات
   */
  getMonthlyRevenue(): Observable<any[]> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return from(this.supabase.client
      .from('sales_invoices')
      .select('sale_date, total')
      .gte('sale_date', startOfMonth)
      .order('sale_date')
    ).pipe(
      map(response => {
        const data = (response.data as any[]) || [];

        // تجميع البيانات حسب التاريخ
        const grouped = data.reduce((acc: any, curr) => {
          const date = curr.sale_date;
          if (!acc[date]) acc[date] = 0;
          acc[date] += curr.total;
          return acc;
        }, {});

        return Object.keys(grouped).map(date => ({
          name: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          value: grouped[date]
        }));
      })
    );
  }

  /**
   * جلب الكتب الأكثر مبيعاً
   */
  getTopBooks(limit: number = 5): Observable<any[]> {
    return from(this.supabase.client
      .from('book_sales')
      .select(`
        quantity,
        total_syp,
        books ( title, author )
      `)
      .order('quantity', { ascending: false })
      .limit(50)
    ).pipe(
      map(res => {
        const sales = (res.data as any[]) || [];
        const bookStats: any = {};

        sales.forEach((sale: any) => {
          // التعامل الآمن مع البيانات المتداخلة
          const bookInfo = Array.isArray(sale.books) ? sale.books[0] : sale.books;
          const title = bookInfo?.title || 'غير معروف';

          if (!bookStats[title]) {
            bookStats[title] = { name: title, value: 0, author: bookInfo?.author };
          }
          bookStats[title].value += sale.quantity;
        });

        return Object.values(bookStats)
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, limit);
      })
    );
  }

  /**
   * جلب النشاطات الأخيرة
   */
  getRecentActivities(limit: number = 10): Observable<any[]> {
    return forkJoin({
      invoices: from(this.supabase.client
        .from('sales_invoices')
        .select('invoice_number, created_at, customer_name, total')
        .order('created_at', { ascending: false })
        .limit(limit)
      ),
      projects: from(this.supabase.client
        .from('projects')
        .select('title, created_at, status')
        .order('created_at', { ascending: false })
        .limit(limit)
      )
    }).pipe(
      map(results => {
        const activities: any[] = [];
        const invoices = (results.invoices.data as any[]) || [];
        const projects = (results.projects.data as any[]) || [];

        invoices.forEach(inv => {
          activities.push({
            id: inv.invoice_number,
            type: 'invoice',
            title: `فاتورة جديدة #${inv.invoice_number}`,
            description: `للعميل ${inv.customer_name || 'نقدي'}`,
            time: inv.created_at,
            amount: inv.total
          });
        });

        projects.forEach(proj => {
          activities.push({
            id: proj.title,
            type: 'project',
            title: `مشروع جديد: ${proj.title}`,
            description: `الحالة: ${proj.status}`,
            time: proj.created_at
          });
        });

        return activities
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, limit);
      })
    );
  }
}
