// src/app/features/customers/customers.service.ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import { Customer, CustomerType, Country } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class CustomersService extends BaseService<Customer> {
  protected override tableName = 'customers';

  protected override getSearchColumns(): string[] {
    return ['name', 'email', 'phone', 'address'];
  }

  // ==================== CUSTOM METHODS ====================

  getCustomersWithRelations(): Observable<Customer[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code),
          customer_type:customer_types(id, name, description)
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Customer[]);
            this.clearError();
            observer.next(data as Customer[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  getCustomerDetail(customerId: string): Observable<Customer | null> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code),
          customer_type:customer_types(id, name, description),
          projects(
            id,
            title,
            status,
            total_price,
            currency,
            created_at
          ),
          invoices(
            id,
            invoice_number,
            amount_due,
            status,
            issue_date
          )
        `)
        .eq('id', customerId)
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.clearError();
            observer.next(data as Customer);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  getCustomersByType(typeId: number): Observable<Customer[]> {
    return this.getFiltered({
      column: 'customer_type_id',
      value: typeId
    });
  }

  getCustomersByCountry(countryId: number): Observable<Customer[]> {
    return this.getFiltered({
      column: 'country_id',
      value: countryId
    });
  }

  searchCustomers(query: string): Observable<Customer[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Customer[]);
            this.clearError();
            observer.next(data as Customer[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  getCustomerStats(customerId: string): Observable<{
    totalProjects: number;
    activeProjects: number;
    totalRevenue: number;
    totalPaid: number;
    totalDue: number;
  }> {
    return this.supabase.rpc('get_customer_stats', { customer_id: customerId });
  }

  getCustomerPayments(customerId: string): Observable<any[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('invoice_payments')
        .select(`
          *,
          invoice:invoices!inner(
            invoice_number,
            customer_id
          )
        `)
        .eq('invoice.customer_id', customerId)
        .order('paid_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data);
            observer.complete();
          }
        });
    });
  }

  // ==================== CUSTOMER TYPES ====================

  getCustomerTypes(): Observable<CustomerType[]> {
    return this.supabase.select<CustomerType>('customer_types', '*');
  }

  /**
   * Create customer type - FIXED with type assertion
   */
  createCustomerType(data: Omit<CustomerType, 'id'>): Observable<CustomerType> {
    return new Observable(observer => {
      this.supabase.client
        .from('customer_types')
        .insert({
          name: data.name,
          description: data.description
        } as any)
        .select()
        .single()
        .then(({ data: result, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(result as CustomerType);
            observer.complete();
          }
        });
    });
  }

  // ==================== COUNTRIES ====================

  getCountries(): Observable<Country[]> {
    return this.supabase.select<Country>('countries', '*');
  }

  // ==================== VALIDATION ====================

  async isEmailExists(email: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.client
      .from(this.tableName)
      .select('id')
      .eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  }

  async isPhoneExists(phone: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.client
      .from(this.tableName)
      .select('id')
      .eq('phone', phone);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  }

  // ==================== EXPORT ====================

  getCustomersForExport(): Observable<any[]> {
    return this.getCustomersWithRelations().pipe(
      map((customers: Customer[]) =>
        customers.map(c => ({
          'الاسم': c.name,
          'الهاتف': c.phone || '-',
          'البريد الإلكتروني': c.email || '-',
          'البلد': c.country?.name || '-',
          'نوع العميل': c.customer_type?.name || '-',
          'العنوان': c.address || '-',
          'تاريخ التسجيل': new Date(c.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }
}
