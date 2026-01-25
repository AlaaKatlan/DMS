// src/app/features/books/services/book-sales.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';

export interface BookSale {
  id: string;
  book_id: number;
  customer_id?: string;
  customer_name?: string;
  quantity: number;
  unit_price_usd: number;
  unit_price_syp: number;
  total_usd: number;
  total_syp: number;
  currency: 'USD' | 'SYP';
  payment_method: string;
  sale_date: string;
  notes?: string;
  created_at: string;

  // Relations
  book?: any;
  customer?: any;
}

export interface SalesReport {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  booksSold: number;
  topBooks: Array<{
    book_id: number;
    book_title: string;
    quantity_sold: number;
    revenue: number;
  }>;
  salesByDate: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class BookSalesService {
  private supabase = inject(SupabaseService);

  // إنشاء عملية بيع جديدة
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

  // جلب جميع المبيعات مع التفاصيل
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

  // جلب مبيعات كتاب معين
  getSalesByBook(bookId: number): Observable<BookSale[]> {
    return from(
      this.supabase.client
        .from('book_sales')
        .select('*')
        .eq('book_id', bookId)
        .order('sale_date', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as BookSale[];
      })
    );
  }

  // جلب مبيعات عميل معين
  getSalesByCustomer(customerId: string): Observable<BookSale[]> {
    return from(
      this.supabase.client
        .from('book_sales')
        .select('*')
        .eq('customer_id', customerId)
        .order('sale_date', { ascending: false })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data as BookSale[];
      })
    );
  }

  // تقرير المبيعات
  getSalesReport(startDate?: string, endDate?: string): Observable<SalesReport> {
    return from(
      this.supabase.rpc('get_book_sales_report', {
        start_date: startDate,
        end_date: endDate
      })
    ).pipe(
      map((data: any) => data as SalesReport)
    );
  }

  // أكثر الكتب مبيعاً
  getTopSellingBooks(limit: number = 10): Observable<any[]> {
    return from(
      this.supabase.client
        .from('book_sales')
        .select('book_id, quantity, books(title, author)')
        .order('quantity', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data;
      })
    );
  }

  // حذف عملية بيع
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
}
