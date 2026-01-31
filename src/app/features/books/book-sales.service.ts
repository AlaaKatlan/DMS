// src/app/features/books/book-sales.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, forkJoin } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';

// ✅ واجهات محسّنة
export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  seller_id?: string;
  seller_name?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  total: number;
  payment_method: 'cash' | 'card' | 'transfer';
  notes?: string;
  sale_date: string;
  created_at: string;
  items?: BookSale[];
}

export interface BookSale {
  id: string;
  invoice_id?: string;
  book_id: number;
  customer_id?: string;
  customer_name?: string;
  quantity: number;
  unit_price_usd: number;
  unit_price_syp: number;
  total_usd: number;
  total_syp: number;
  currency: 'USD' | 'SYP';
  payment_method?: string;
  sale_date: string;
  notes?: string;
  created_at: string;
  seller_name?: string;
  seller_id?: string;

  // Relations
  book?: any;
  customer?: any;
}

@Injectable({
  providedIn: 'root'
})
export class BookSalesService {
  private supabase = inject(SupabaseService);

  // ==================== INVOICES ====================

  /**
   * جلب جميع فواتير المبيعات مع الأصناف
   */
  getSalesInvoicesWithItems(): Observable<SalesInvoice[]> {
    return new Observable(observer => {
      // 1️⃣ جلب الفواتير
      this.supabase.client
        .from('sales_invoices')
        .select(`
          *,
          customer:customers(id, name, phone),
          seller:profiles(id, full_name, full_name_p)
        `)
        .order('sale_date', { ascending: false })
        .then(({ data: invoices, error: invoicesError }: any) => {
          if (invoicesError) {
            observer.error(invoicesError);
            return;
          }

          if (!invoices || invoices.length === 0) {
            observer.next([]);
            observer.complete();
            return;
          }

          // 2️⃣ جلب الأصناف لكل فاتورة
          const invoiceIds = invoices.map((inv: any) => inv.id);

          this.supabase.client
            .from('book_sales')
            .select(`
              *,
              book:books(book_id, title, author, cover_image_url, price_syp, price_usd)
            `)
            .in('invoice_id', invoiceIds)
            .then(({ data: sales, error: salesError }: any) => {
              if (salesError) {
                observer.error(salesError);
                return;
              }

              // 3️⃣ ربط الأصناف بالفواتير
              const result: SalesInvoice[] = invoices.map((invoice: any) => {
                const invoiceItems = (sales || []).filter(
                  (sale: any) => sale.invoice_id === invoice.id
                );

                return {
                  id: invoice.id,
                  invoice_number: invoice.invoice_number,
                  customer_id: invoice.customer_id,
                  customer_name: invoice.customer_name || invoice.customer?.name,
                  seller_id: invoice.seller_id,
                  seller_name: invoice.seller_name || invoice.seller?.full_name_p,
                  subtotal: invoice.subtotal || 0,
                  discount_amount: invoice.discount_amount || 0,
                  discount_percentage: invoice.discount_percentage || 0,
                  total: invoice.total || 0,
                  payment_method: invoice.payment_method,
                  notes: invoice.notes,
                  sale_date: invoice.sale_date,
                  created_at: invoice.created_at,
                  items: invoiceItems
                } as SalesInvoice;
              });

              observer.next(result);
              observer.complete();
            });
        });
    });
  }

  /**
   * إنشاء فاتورة بيع جديدة مع الأصناف
   */
  createSalesInvoice(
    invoiceData: Partial<SalesInvoice>,
    items: Partial<BookSale>[]
  ): Observable<SalesInvoice> {
    return new Observable(observer => {
      // 1️⃣ إنشاء الفاتورة
      this.supabase.client
        .from('sales_invoices')
        .insert({
          invoice_number: invoiceData.invoice_number,
          customer_id: invoiceData.customer_id,
          customer_name: invoiceData.customer_name,
          seller_id: invoiceData.seller_id,
          seller_name: invoiceData.seller_name,
          subtotal: invoiceData.subtotal || 0,
          discount_amount: invoiceData.discount_amount || 0,
          discount_percentage: invoiceData.discount_percentage || 0,
          total: invoiceData.total || 0,
          payment_method: invoiceData.payment_method,
          notes: invoiceData.notes,
          sale_date: invoiceData.sale_date || new Date().toISOString()
        } as any)
        .select()
        .single()
        .then(({ data: invoice, error: invoiceError }: any) => {
          if (invoiceError) {
            observer.error(invoiceError);
            return;
          }

          // 2️⃣ إنشاء الأصناف
          const salesItems = items.map(item => ({
            invoice_id: invoice.id,
            book_id: item.book_id,
            customer_id: invoiceData.customer_id,
            customer_name: invoiceData.customer_name,
            quantity: item.quantity,
            unit_price_usd: item.unit_price_usd || 0,
            unit_price_syp: item.unit_price_syp || 0,
            total_usd: item.total_usd || 0,
            total_syp: item.total_syp || 0,
            currency: item.currency || 'SYP',
            payment_method: invoiceData.payment_method,
            sale_date: invoiceData.sale_date || new Date().toISOString(),
            notes: item.notes,
            seller_id: invoiceData.seller_id,
            seller_name: invoiceData.seller_name
          }));

          this.supabase.client
            .from('book_sales')
            .insert(salesItems as any)
            .select()
            .then(({ data: createdSales, error: salesError }: any) => {
              if (salesError) {
                observer.error(salesError);
                return;
              }

              const result: SalesInvoice = {
                ...invoice,
                items: createdSales
              };

              observer.next(result);
              observer.complete();
            });
        });
    });
  }

  /**
   * حذف فاتورة بيع مع جميع أصنافها
   */
  deleteSalesInvoice(invoiceId: string): Observable<void> {
    return new Observable(observer => {
      // 1️⃣ حذف الأصناف أولاً
      this.supabase.client
        .from('book_sales')
        .delete()
        .eq('invoice_id', invoiceId)
        .then(({ error: salesError }: any) => {
          if (salesError) {
            observer.error(salesError);
            return;
          }

          // 2️⃣ حذف الفاتورة
          this.supabase.client
            .from('sales_invoices')
            .delete()
            .eq('id', invoiceId)
            .then(({ error: invoiceError }: any) => {
              if (invoiceError) {
                observer.error(invoiceError);
              } else {
                observer.next();
                observer.complete();
              }
            });
        });
    });
  }

  // ==================== OLD METHODS (للتوافق) ====================

  /**
   * إنشاء عملية بيع فردية (قديم - للتوافق)
   */
  createSale(saleData: Partial<BookSale>): Observable<BookSale> {
    return from(
      (this.supabase.client.from('book_sales') as any)
        .insert({
          book_id: saleData.book_id,
          customer_id: saleData.customer_id,
          customer_name: saleData.customer_name,
          quantity: saleData.quantity,
          unit_price_usd: saleData.unit_price_usd,
          unit_price_syp: saleData.unit_price_syp,
          total_usd: saleData.total_usd,
          total_syp: saleData.total_syp,
          currency: saleData.currency || 'USD',
          payment_method: saleData.payment_method,
          sale_date: saleData.sale_date || new Date().toISOString(),
          notes: saleData.notes
        })
        .select()
        .single()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as BookSale;
      })
    );
  }

  /**
   * جلب جميع المبيعات مع التفاصيل (قديم)
   */
  getSalesWithDetails(): Observable<BookSale[]> {
    return from(
      this.supabase.client
        .from('book_sales')
        .select(`
          *,
          book:books(book_id, title, author, cover_image_url),
          customer:customers(id, name, phone)
        `)
        .order('sale_date', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as BookSale[];
      })
    );
  }

  /**
   * حذف عملية بيع (قديم)
   */
  deleteSale(saleId: string): Observable<void> {
    return from(
      this.supabase.client
        .from('book_sales')
        .delete()
        .eq('id', saleId)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
      })
    );
  }

  // ==================== UTILITIES ====================

  /**
   * توليد رقم فاتورة تلقائي
   */
  generateInvoiceNumber(): Observable<string> {
    return new Observable(observer => {
      this.supabase.client
        .from('sales_invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
            return;
          }

          let nextNumber = 1;
          if (data && data.length > 0) {
            const lastNumber = data[0].invoice_number;
            const match = lastNumber.match(/INV-(\d+)/);
            if (match) {
              nextNumber = parseInt(match[1]) + 1;
            }
          }

          const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;
          observer.next(invoiceNumber);
          observer.complete();
        });
    });
  }
}
