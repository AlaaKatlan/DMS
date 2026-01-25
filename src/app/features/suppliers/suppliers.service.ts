import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseService } from '../../core/services/base.service';
import { SupplierExtended, PurchaseOrder } from './models/supplier.model';
import { ContactPerson, SupplierPayment } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService extends BaseService<SupplierExtended> {
  protected override tableName = 'suppliers';

  getSuppliersWithRelations(): Observable<SupplierExtended[]> {
    return from(
      (this.supabase.client.from(this.tableName) as any)
        .select(`*, country:countries(id, name, code)`)
        .order('created_at', { ascending: false })
    ).pipe(map(({ data, error }: any) => { if (error) throw error; return data; }));
  }

  getSupplierDetail(supplierId: string): Observable<SupplierExtended> {
    return from(
      (this.supabase.client.from(this.tableName) as any)
        .select(`*, country:countries(id, name, code), contacts:supplier_contacts(*)`)
        .eq('id', supplierId)
        .single()
    ).pipe(map(({ data, error }: any) => { if (error) throw error; return data; }));
  }

  // ✅ جلب الدول للقائمة المنسدلة
  getCountries(): Observable<any[]> {
    return from(this.supabase.client.from('countries').select('*'))
      .pipe(map(({ data }) => data || []));
  }

  createSupplierWithDetails(supplier: any, contacts: ContactPerson[]): Observable<SupplierExtended> {
    return from(
      (this.supabase.client.from(this.tableName) as any).insert(supplier).select().single()
    ).pipe(
      switchMap(({ data: newSupplier, error }: any) => {
        if (error) throw error;
        if (contacts && contacts.length > 0) {
          const contactsWithId = contacts.map(c => ({ ...c, supplier_id: newSupplier.id }));
          return from((this.supabase.client.from('supplier_contacts') as any).insert(contactsWithId))
            .pipe(map(() => newSupplier));
        }
        return of(newSupplier);
      })
    );
  }

  checkDuplicate(name: string, taxId?: string): Observable<boolean> {
    let query = this.supabase.client.from(this.tableName).select('id');
    if (taxId) query = query.or(`name.eq.${name},tax_id.eq.${taxId}`);
    else query = query.eq('name', name);
    return from(query).pipe(map(({ data }) => !!(data && data.length)));
  }

  // ==================== أوامر الشراء (Purchase Orders) ====================

  createPurchaseOrder(po: any, lines: any[]): Observable<PurchaseOrder> {
    // 1. إنشاء رأس الطلب
    return from(
      (this.supabase.client.from('purchase_orders') as any).insert(po).select().single()
    ).pipe(
      switchMap(({ data: newPO, error }: any) => {
        if (error) throw error;
        // 2. إدخال البنود
        if (lines.length > 0) {
          const linesData = lines.map(line => ({
            po_id: newPO.id,
            book_id: line.book_id, // ✅ ربط بالكتاب
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price
          }));
          return from((this.supabase.client.from('purchase_order_lines') as any).insert(linesData))
            .pipe(map(() => newPO));
        }
        return of(newPO);
      })
    );
  }

  getSupplierOrders(supplierId: string): Observable<PurchaseOrder[]> {
    return from(
      (this.supabase.client.from('purchase_orders') as any)
        .select(`*, lines:purchase_order_lines(*), payments:supplier_payments(*)`)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data.map((po: any) => {
          const paid = po.payments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;
          return { ...po, total_paid: paid, remaining: (Number(po.total_amount) || 0) - paid };
        });
      })
    );
  }

  getSupplierPayments(supplierId: string): Observable<SupplierPayment[]> {
    return from(
      (this.supabase.client.from('supplier_payments') as any)
        .select('*').eq('supplier_id', supplierId).order('paid_at', { ascending: false })
    ).pipe(map(({ data, error }: any) => { if (error) throw error; return data; }));
  }

  addSupplierPayment(payment: any): Observable<any> {
    return from((this.supabase.client.from('supplier_payments') as any).insert(payment).select().single())
      .pipe(map(({ data, error }: any) => { if (error) throw error; return data; }));
  }
}
