// src/app/features/accounting/accounting.service.ts
import { Injectable } from '@angular/core';
import { Observable, map, forkJoin } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  LedgerEntry,
  AccountBalance,
  Currency
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class AccountingService extends BaseService<LedgerEntry> {
  protected override tableName = 'ledger_entries';

  protected override getSearchColumns(): string[] {
    return ['description', 'reference_type'];
  }

  // ==================== LEDGER ENTRIES ====================

  /**
   * Get all ledger entries with details
   */
  getLedgerEntries(): Observable<LedgerEntry[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as LedgerEntry[]);
            this.clearError();
            observer.next(data as LedgerEntry[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Get ledger entries by date range
   */
  getLedgerByDateRange(startDate: string, endDate: string): Observable<LedgerEntry[]> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as LedgerEntry[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get income entries
   */
  getIncomeEntries(startDate?: string, endDate?: string): Observable<LedgerEntry[]> {
    return new Observable(observer => {
      let query = this.supabase.client
        .from(this.tableName)
        .select('*')
        .eq('entry_type', 'income');

      if (startDate) query = query.gte('entry_date', startDate);
      if (endDate) query = query.lte('entry_date', endDate);

      query.order('entry_date', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as LedgerEntry[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get expense entries
   */
  getExpenseEntries(startDate?: string, endDate?: string): Observable<LedgerEntry[]> {
    return new Observable(observer => {
      let query = this.supabase.client
        .from(this.tableName)
        .select('*')
        .eq('entry_type', 'expense');

      if (startDate) query = query.gte('entry_date', startDate);
      if (endDate) query = query.lte('entry_date', endDate);

      query.order('entry_date', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as LedgerEntry[]);
            observer.complete();
          }
        });
    });
  }

  // ==================== ACCOUNT BALANCE ====================

  /**
   * Get current account balance
   */
  getAccountBalance(currency: Currency = 'USD'): Observable<AccountBalance> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('entry_type, amount')
        .eq('currency', currency)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const entries = data as LedgerEntry[];

            const totalIncome = entries
              .filter(e => e.entry_type === 'income')
              .reduce((sum, e) => sum + e.amount, 0);

            const totalExpenses = entries
              .filter(e => e.entry_type === 'expense')
              .reduce((sum, e) => sum + e.amount, 0);

            const balance: AccountBalance = {
              currency,
              total_income: totalIncome,
              total_expenses: totalExpenses,
              balance: totalIncome - totalExpenses,
              as_of_date: new Date().toISOString()
            };

            observer.next(balance);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get account balance by date range
   */
  getBalanceByDateRange(
    startDate: string,
    endDate: string,
    currency: Currency = 'USD'
  ): Observable<AccountBalance> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('entry_type, amount')
        .eq('currency', currency)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const entries = data as LedgerEntry[];

            const totalIncome = entries
              .filter(e => e.entry_type === 'income')
              .reduce((sum, e) => sum + e.amount, 0);

            const totalExpenses = entries
              .filter(e => e.entry_type === 'expense')
              .reduce((sum, e) => sum + e.amount, 0);

            const balance: AccountBalance = {
              currency,
              total_income: totalIncome,
              total_expenses: totalExpenses,
              balance: totalIncome - totalExpenses,
              as_of_date: endDate
            };

            observer.next(balance);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get balances for all currencies
   */
  getAllCurrencyBalances(): Observable<AccountBalance[]> {
    const currencies: Currency[] = ['USD', 'AED', 'QR', 'SYP', 'OMR'];

    return forkJoin(
      currencies.map(currency => this.getAccountBalance(currency))
    );
  }

  // ==================== PROFIT & LOSS ====================

  /**
   * Get profit and loss statement
   */
  getProfitAndLoss(
    startDate: string,
    endDate: string
  ): Observable<{
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    profitMargin: number;
  }> {
    return this.supabase.rpc('get_profit_and_loss', {
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * Get monthly profit and loss
   */
  getMonthlyProfitAndLoss(year: number): Observable<Array<{
    month: number;
    revenue: number;
    expenses: number;
    profit: number;
  }>> {
    return this.supabase.rpc('get_monthly_profit_and_loss', {
      report_year: year
    });
  }

  // ==================== CASH FLOW ====================

  /**
   * Get cash flow statement
   */
  getCashFlow(
    startDate: string,
    endDate: string
  ): Observable<{
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
  }> {
    return this.supabase.rpc('get_cash_flow', {
      start_date: startDate,
      end_date: endDate
    });
  }

  // ==================== RECONCILIATION ====================

  /**
   * Reconcile accounts
   */
  reconcileAccounts(
    startDate: string,
    endDate: string
  ): Observable<{
    ledgerBalance: number;
    bankBalance: number;
    difference: number;
    reconciled: boolean;
  }> {
    return this.supabase.rpc('reconcile_accounts', {
      start_date: startDate,
      end_date: endDate
    });
  }

  // ==================== REPORTS ====================

  /**
   * Get income by category
   */
  getIncomeByCategory(startDate: string, endDate: string): Observable<Array<{
    category: string;
    amount: number;
    percentage: number;
  }>> {
    return this.supabase.rpc('get_income_by_category', {
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * Get expenses by category
   */
  getExpensesByCategory(startDate: string, endDate: string): Observable<Array<{
    category: string;
    amount: number;
    percentage: number;
  }>> {
    return this.supabase.rpc('get_expenses_by_category', {
      start_date: startDate,
      end_date: endDate
    });
  }

  /**
   * Get top customers by revenue
   */
  getTopCustomersByRevenue(
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Observable<Array<{
    customer_id: string;
    customer_name: string;
    total_revenue: number;
    invoice_count: number;
  }>> {
    return this.supabase.rpc('get_top_customers_by_revenue', {
      start_date: startDate,
      end_date: endDate,
      limit_count: limit
    });
  }

  /**
   * Get revenue trend
   */
  getRevenueTrend(months: number = 12): Observable<Array<{
    month: string;
    revenue: number;
    growth: number;
  }>> {
    return this.supabase.rpc('get_revenue_trend', {
      months_count: months
    });
  }

  // ==================== STATISTICS ====================

  /**
   * Get financial summary
   */
  getFinancialSummary(year: number): Observable<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    averageMonthlyRevenue: number;
    averageMonthlyExpenses: number;
    bestMonth: { month: number; revenue: number };
    worstMonth: { month: number; revenue: number };
  }> {
    return this.supabase.rpc('get_financial_summary', {
      summary_year: year
    });
  }

  // ==================== EXPORT ====================

  /**
   * Get ledger for export
   */
  getLedgerForExport(startDate?: string, endDate?: string): Observable<any[]> {
    const entries$ = startDate && endDate
      ? this.getLedgerByDateRange(startDate, endDate)
      : this.getLedgerEntries();

    return entries$.pipe(
      map((entries: LedgerEntry[]) =>
        entries.map(e => ({
          'النوع': e.entry_type === 'income' ? 'إيراد' : 'مصروف',
          'المبلغ': e.amount,
          'العملة': e.currency,
          'الفئة': e.category || '-',
          'المرجع': e.reference_type || '-',
          'الوصف': e.description || '-',
          'تاريخ القيد': new Date(e.entry_date).toLocaleDateString('ar-SA'),
          'تاريخ الإنشاء': new Date(e.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }

  /**
   * Generate financial report
   */
  generateFinancialReport(
    startDate: string,
    endDate: string,
    reportType: 'profit_loss' | 'cash_flow' | 'balance_sheet'
  ): Observable<Blob> {
    return this.supabase.rpc('generate_financial_report', {
      start_date: startDate,
      end_date: endDate,
      report_type: reportType
    });
  }
}
