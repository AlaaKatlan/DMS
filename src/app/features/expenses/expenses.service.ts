// // src/app/features/expenses/expenses.service.ts
// import { Injectable } from '@angular/core';
// import { Observable, map } from 'rxjs';
// import { BaseService } from '../../core/services/base.service';
// import {
//   Expense,
//   ExpenseCategory,
//   Currency,
//   PaymentMethod
// } from '../../core/models/base.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class ExpensesService extends BaseService<Expense> {
//   protected override tableName = 'expenses';

//   protected override getSearchColumns(): string[] {
//     return ['title', 'notes'];
//   }

//   // ==================== EXPENSES ====================

//   /**
//    * Get expenses with relations
//    */
//   getExpensesWithRelations(): Observable<Expense[]> {
//     this.setLoading(true);

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           project:projects(id, title),
//           entered_by_user:profiles!entered_by(id, full_name),
//           approved_by_user:profiles!approved_by(id, full_name)
//         `)
//         .order('expense_date', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             this.setError(error.message);
//             observer.error(error);
//           } else {
//             this.items$.next(data as Expense[]);
//             this.clearError();
//             observer.next(data as Expense[]);
//             observer.complete();
//           }

//           this.setLoading(false);
//         });
//     });
//   }

//   /**
//    * Get expenses by project
//    */
//   getProjectExpenses(projectId: string): Observable<Expense[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           entered_by_user:profiles!entered_by(id, full_name)
//         `)
//         .eq('project_id', projectId)
//         .order('expense_date', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get expenses by category
//    */
//   getExpensesByCategory(category: ExpenseCategory): Observable<Expense[]> {
//     return this.getFiltered({
//       column: 'category',
//       value: category
//     });
//   }

//   /**
//    * Get pending expenses (not approved)
//    */
//   getPendingExpenses(): Observable<Expense[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           entered_by_user:profiles!entered_by(id, full_name, avatar_url),
//           project:projects(id, title)
//         `)
//         .eq('approved', false)
//         .order('expense_date', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get approved expenses
//    */
//   getApprovedExpenses(): Observable<Expense[]> {
//     return this.getFiltered({
//       column: 'approved',
//       value: true
//     });
//   }

//   /**
//    * Get expenses without receipt
//    */
//   getExpensesWithoutReceipt(): Observable<Expense[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           entered_by_user:profiles!entered_by(id, full_name)
//         `)
//         .is('receipt_path', null)
//         .order('expense_date', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get expenses by date range
//    */
//   getExpensesByDateRange(startDate: string, endDate: string): Observable<Expense[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select('*')
//         .gte('expense_date', startDate)
//         .lte('expense_date', endDate)
//         .order('expense_date', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Approve expense
//    */
//   approveExpense(expenseId: string, approverId: string): Observable<Expense> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .update({
//           approved: true,
//           approved_by: approverId,
//           ['approved_at']: new Date().toISOString()
//         } as any)
//         .eq('id', expenseId)
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Reject/Unapprove expense
//    */
//   rejectExpense(expenseId: string): Observable<Expense> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .update({
//           approved: false,
//           approved_by: null,
//           ['approved_at']: null
//         } as any)
//         .eq('id', expenseId)
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Expense);
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== STATISTICS ====================

//   /**
//    * Get monthly expenses summary
//    */
//   getMonthlyExpensesSummary(year: number, month: number): Observable<{
//     total: number;
//     byCategory: Array<{ category: string; amount: number }>;
//     byProject: Array<{ project: string; amount: number }>;
//   }> {
//     return this.supabase.rpc('get_monthly_expenses_summary', {
//       expense_year: year,
//       expense_month: month
//     });
//   }

//   /**
//    * Get total expenses by date range
//    */
//   getTotalExpenses(startDate: string, endDate: string): Observable<number> {
//     return this.getExpensesByDateRange(startDate, endDate).pipe(
//       map((expenses: Expense[]) =>
//         expenses
//           .filter(e => e.approved)
//           .reduce((sum, e) => sum + e.amount, 0)
//       )
//     );
//   }

//   /**
//    * Get expenses breakdown by category
//    */
//   getExpensesByCategory(startDate: string, endDate: string): Observable<Array<{
//     category: ExpenseCategory;
//     amount: number;
//     count: number;
//   }>> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select('category, amount')
//         .eq('approved', true)
//         .gte('expense_date', startDate)
//         .lte('expense_date', endDate)
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             const expenses = data as Expense[];
//             const grouped = expenses.reduce((acc: any, exp) => {
//               const cat = exp.category || 'other';
//               if (!acc[cat]) {
//                 acc[cat] = { category: cat, amount: 0, count: 0 };
//               }
//               acc[cat].amount += exp.amount;
//               acc[cat].count++;
//               return acc;
//             }, {});

//             observer.next(Object.values(grouped));
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get user expenses statistics
//    */
//   getUserExpensesStats(userId: string): Observable<{
//     total: number;
//     pending: number;
//     approved: number;
//     rejected: number;
//   }> {
//     return this.supabase.rpc('get_user_expenses_stats', { user_id: userId });
//   }

//   // ==================== VALIDATION ====================

//   /**
//    * Check if expense needs receipt
//    */
//   needsReceipt(amount: number, threshold: number = 100): boolean {
//     return amount >= threshold;
//   }

//   // ==================== EXPORT ====================

//   /**
//    * Get expenses for export
//    */
//   getExpensesForExport(startDate?: string, endDate?: string): Observable<any[]> {
//     const expenses$ = startDate && endDate
//       ? this.getExpensesByDateRange(startDate, endDate)
//       : this.getExpensesWithRelations();

//     return expenses$.pipe(
//       map((expenses: Expense[]) =>
//         expenses.map(e => ({
//           'العنوان': e.title,
//           'المبلغ': e.amount,
//           'العملة': e.currency,
//           'الفئة': e.category || '-',
//           'تاريخ المصروف': new Date(e.expense_date).toLocaleDateString('ar-SA'),
//           'المشروع': e.project?.title || '-',
//           'طريقة الدفع': e.payment_method || '-',
//           'معتمد': e.approved ? 'نعم' : 'لا',
//           'المعتمد من': e.approved_by_user?.full_name || '-',
//           'إيصال': e.receipt_path ? 'نعم' : 'لا',
//           'المُدخل بواسطة': e.entered_by_user?.full_name || '-',
//           'تاريخ الإنشاء': new Date(e.created_at).toLocaleDateString('ar-SA')
//         }))
//       )
//     );
//   }

//   /**
//    * Get expenses report
//    */
//   generateExpensesReport(startDate: string, endDate: string): Observable<any> {
//     return this.supabase.rpc('generate_expenses_report', {
//       start_date: startDate,
//       end_date: endDate
//     });
//   }
// }
