import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseService } from '../../core/services/base.service';
import {
  SupplierExtended,
  PurchaseOrder,
  PurchaseOrderLine,
  SupplierContact
} from './models/supplier.model';
import { SupplierPayment } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService extends BaseService<SupplierExtended> {
  protected override tableName = 'suppliers';

  // ==================== دوال القراءة ====================

  getSuppliersWithRelations(): Observable<SupplierExtended[]> {
    return from(
      (this.supabase.client.from(this.tableName) as any)
        .select(`
          *,
          country:countries(id, name, code)
        `)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as SupplierExtended[];
      })
    );
  }

  getSupplierDetail(supplierId: string): Observable<SupplierExtended> {
    return from(
      (this.supabase.client.from(this.tableName) as any)
        .select(`
          *,
          country:countries(id, name, code),
          contacts:supplier_contacts(*)
        `)
        .eq('id', supplierId)
        .single()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as SupplierExtended;
      })
    );
  }

  // ==================== الإضافة والتحقق ====================

  createSupplierWithDetails(supplier: Partial<SupplierExtended>, contacts: SupplierContact[]): Observable<SupplierExtended> {
    return from(
      (this.supabase.client.from(this.tableName) as any)
        .insert(supplier)
        .select()
        .single()
    ).pipe(
      switchMap(({ data: newSupplier, error }: any) => {
        if (error) throw error;

        if (contacts && contacts.length > 0) {
          const contactsWithId = contacts.map(c => ({ ...c, supplier_id: newSupplier.id }));
          return from(
            (this.supabase.client.from('supplier_contacts') as any)
              .insert(contactsWithId)
          ).pipe(
            map(() => newSupplier as SupplierExtended)
          );
        }
        return of(newSupplier as SupplierExtended);
      })
    );
  }

  checkDuplicate(name: string, taxId?: string): Observable<boolean> {
    let query = this.supabase.client.from(this.tableName).select('id');
    if (taxId) {
       query = query.or(`name.eq.${name},tax_id.eq.${taxId}`);
    } else {
       query = query.eq('name', name);
    }

    return from(query).pipe(
      map(({ data, error }) => {
        if (error) return false;
        return (data && data.length > 0) ? true : false;
      })
    );
  }

  // ==================== أوامر الشراء ====================

  createPurchaseOrder(po: Partial<PurchaseOrder>, lines: PurchaseOrderLine[]): Observable<PurchaseOrder> {
    return from(
      (this.supabase.client.from('purchase_orders') as any)
        .insert(po)
        .select()
        .single()
    ).pipe(
      switchMap(({ data: newPO, error }: any) => {
        if (error) throw error;

        if (lines.length > 0) {
          const linesWithId = lines.map(l => ({ ...l, po_id: newPO.id }));
          return from(
            (this.supabase.client.from('purchase_order_lines') as any)
              .insert(linesWithId)
          ).pipe(
            map(() => newPO as PurchaseOrder)
          );
        }
        return of(newPO as PurchaseOrder);
      })
    );
  }

  getSupplierOrders(supplierId: string): Observable<PurchaseOrder[]> {
    return from(
      (this.supabase.client.from('purchase_orders') as any)
        .select('*, lines:purchase_order_lines(*)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })
    ).pipe(map(({ data, error }: any) => {
      if (error) throw error;
      return data as PurchaseOrder[];
    }));
  }

  // ==================== المدفوعات ====================

  getSupplierPayments(supplierId: string): Observable<SupplierPayment[]> {
    return from(
      (this.supabase.client.from('supplier_payments') as any)
        .select('*')
        .eq('supplier_id', supplierId)
        .order('paid_at', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as SupplierPayment[];
      })
    );
  }

  addSupplierPayment(payment: any): Observable<any> {
    return from(
      (this.supabase.client.from('supplier_payments') as any)
        .insert(payment)
        .select()
        .single()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data;
      })
    );
  }
}
