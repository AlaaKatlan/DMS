// src/app/features/suppliers/suppliers.service.ts
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  Supplier,
  SupplierPayment,
  PrintOrder,
  PrintOrderPayment,
  Country,
  Currency,
  PaymentMethod
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService extends BaseService<Supplier> {
  protected override tableName = 'suppliers';

  protected override getSearchColumns(): string[] {
    return ['name', 'type', 'phone'];
  }

  // ==================== SUPPLIERS ====================

  getSuppliersWithRelations(): Observable<Supplier[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code)
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Supplier[]);
            this.clearError();
            observer.next(data as Supplier[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  getSupplierDetail(supplierId: string): Observable<Supplier | null> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code),
          payments:supplier_payments(
            id,
            amount,
            currency,
            payment_method,
            paid_at,
            transfer_ref
          ),
          print_orders:print_orders(
            id,
            quantity,
            total_cost,
            status,
            order_date
          )
        `)
        .eq('id', supplierId)
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.clearError();
            observer.next(data as Supplier);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  getSuppliersByType(type: string): Observable<Supplier[]> {
    return this.getFiltered({
      column: 'type',
      value: type
    });
  }

  updateSupplierBalance(supplierId: string): Observable<void> {
    return this.supabase.rpc('update_supplier_balance', { supplier_id: supplierId });
  }

  // ==================== SUPPLIER PAYMENTS ====================

  getSupplierPayments(supplierId: string): Observable<SupplierPayment[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('supplier_payments')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('paid_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as SupplierPayment[]);
            observer.complete();
          }
        });
    });
  }

  addSupplierPayment(payment: Omit<SupplierPayment, 'id' | 'created_at'>): Observable<SupplierPayment> {
    return new Observable(observer => {
      this.supabase.client
        .from('supplier_payments')
        .insert({
          supplier_id: payment.supplier_id,
          amount: payment.amount,
          currency: payment.currency,
          payment_method: payment.payment_method,
          transfer_ref: payment.transfer_ref,
          transfer_company: payment.transfer_company,
          receipt_path: payment.receipt_path,
          paid_at: payment.paid_at,
          notes: payment.notes
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            this.updateSupplierBalance(payment.supplier_id).subscribe();
            observer.next(data as SupplierPayment);
            observer.complete();
          }
        });
    });
  }

  deleteSupplierPayment(paymentId: string, supplierId: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('supplier_payments')
        .delete()
        .eq('id', paymentId)
        .then(({ error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            this.updateSupplierBalance(supplierId).subscribe();
            observer.next();
            observer.complete();
          }
        });
    });
  }

  // ==================== PRINT ORDERS ====================

  getPrintOrders(supplierId: string): Observable<PrintOrder[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('print_orders')
        .select(`
          *,
          book:books(book_id, title, isbn),
          supplier:suppliers(id, name)
        `)
        .eq('supplier_id', supplierId)
        .order('order_date', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as PrintOrder[]);
            observer.complete();
          }
        });
    });
  }

  createPrintOrder(order: Omit<PrintOrder, 'id' | 'created_at'>): Observable<PrintOrder> {
    return new Observable(observer => {
      this.supabase.client
        .from('print_orders')
        .insert({
          book_id: order.book_id,
          supplier_id: order.supplier_id,
          quantity: order.quantity,
          total_cost: order.total_cost,
          status: order.status || 'ordered',
          order_date: order.order_date,
          delivery_date: order.delivery_date,
          notes: order.notes
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as PrintOrder);
            observer.complete();
          }
        });
    });
  }

  // updatePrintOrderStatus(
  //   orderId: string,
  //   status: PrintOrder['status']
  // ): Observable<PrintOrder> {
  //   return new Observable(observer => {
  //     this.supabase.client
  //       .from('print_orders')
  //       .update({ status } as any)
  //       .eq('id', orderId)
  //       .select()
  //       .single()
  //       .then(({ data, error }: any) => {
  //         if (error) {
  //           observer.error(error);
  //         } else {
  //           observer.next(data as PrintOrder);
  //           observer.complete();
  //         }
  //       });
  //   });
  // }

  updatePrintOrderStatus(
    orderId: string,
    status: PrintOrder['status']
  ): Observable<PrintOrder> {
    return new Observable(observer => {
      (this.supabase.client.from('print_orders') as any)
        .update({ status })
        .eq('id', orderId)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as PrintOrder);
            observer.complete();
          }
        });
    });
  }
  getPrintOrderPayments(orderId: string): Observable<PrintOrderPayment[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('print_order_payments')
        .select('*')
        .eq('print_order_id', orderId)
        .order('paid_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as PrintOrderPayment[]);
            observer.complete();
          }
        });
    });
  }

  addPrintOrderPayment(
    payment: Omit<PrintOrderPayment, 'id' | 'created_at'>
  ): Observable<PrintOrderPayment> {
    return new Observable(observer => {
      this.supabase.client
        .from('print_order_payments')
        .insert({
          print_order_id: payment.print_order_id,
          amount: payment.amount,
          currency: payment.currency,
          payment_method: payment.payment_method,
          receipt_path: payment.receipt_path,
          paid_at: payment.paid_at,
          notes: payment.notes
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as PrintOrderPayment);
            observer.complete();
          }
        });
    });
  }

  // ==================== STATISTICS ====================

  getSupplierStats(supplierId: string): Observable<{
    totalOrders: number;
    totalSpent: number;
    totalPaid: number;
    totalDue: number;
    activeOrders: number;
  }> {
    return this.supabase.rpc('get_supplier_stats', { supplier_id: supplierId });
  }

  getTopSuppliers(limit: number = 10): Observable<Array<Supplier & { totalSpent: number }>> {
    return this.supabase.rpc('get_top_suppliers', { limit_count: limit });
  }

  // ==================== VALIDATION ====================

  async isSupplierNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.client
      .from(this.tableName)
      .select('id')
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  }

  // ==================== EXPORT ====================

  getSuppliersForExport(): Observable<any[]> {
    return this.getSuppliersWithRelations().pipe(
      map((suppliers: Supplier[]) =>
        suppliers.map(s => ({
          'الاسم': s.name,
          'النوع': s.type || '-',
          'الهاتف': s.phone || '-',
          'البلد': s.country?.name || '-',
          'الإجمالي المستحق': s.total_due || 0,
          'المدفوع': s.total_paid || 0,
          'المتبقي': (s.total_due || 0) - (s.total_paid || 0),
          'تاريخ التسجيل': new Date(s.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }

  getSupplierStatement(supplierId: string): Observable<any> {
    return this.supabase.rpc('get_supplier_statement', { supplier_id: supplierId });
  }
}
