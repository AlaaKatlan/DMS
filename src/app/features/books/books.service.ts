// src/app/features/books/books.service.ts - النسخة المصلحة والمحسّنة
import { Injectable } from '@angular/core';
import { Observable, map, forkJoin } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  Book,
  BookImage,
  InventoryLog,
  Country,
  Currency
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class BooksService extends BaseService<Book> {
  protected override tableName = 'books';

  protected override getSearchColumns(): string[] {
    return ['title', 'author', 'publisher', 'isbn'];
  }

  // ==================== CUSTOM METHODS ====================

  /**
   * Get books with full relations
   * ⚠️ مهم: نستخدم book_id بدلاً من id
   */
  getBooksWithRelations(): Observable<Book[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code),
          images:book_images(id, image_url, caption)
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Book[]);
            this.clearError();
            observer.next(data as Book[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Get book by ID with full details
   * ⚠️ استخدام book_id بدلاً من id
   */
  getBookDetail(bookId: number): Observable<Book | null> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          country:countries(id, name, code),
          images:book_images(id, image_url, caption, created_at)
        `)
        .eq('book_id', bookId) // ← استخدام book_id
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.clearError();
            observer.next(data as Book);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Override delete method لاستخدام book_id
   */
  override delete(bookId: string | number): Observable<void> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .delete()
        .eq('book_id', bookId) // ← استخدام book_id
        .then(({ error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            // حذف من القائمة المحلية
            const currentItems = this.items$.value;
            this.items$.next(
              currentItems.filter((item: any) => item.book_id !== bookId)
            );
            this.clearError();
            observer.next();
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Override update method لاستخدام book_id
   */
updateBook(bookId: number, data: Partial<Book>): Observable<Book> {
    this.setLoading(true);

    return new Observable(observer => {
      // 👇 الحل هو إضافة (as any) بعد دالة from مباشرة
      (this.supabase.client.from(this.tableName) as any)
        .update(data) // الآن سيقبل البيانات بدون مشاكل
        .eq('book_id', bookId)
        .select()
        .single()
        .then(({ data: result, error }: any) => { // 👈 وأيضاً هنا نستخدم any للنتيجة
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            // تحديث القائمة المحلية لتظهر التعديلات فوراً
            const currentItems = this.items$.value;
            // تأكد من استخدام المفتاح الصحيح للمقارنة
            const index = currentItems.findIndex((item: any) => item.book_id === bookId);
            if (index !== -1) {
              currentItems[index] = result as Book;
              this.items$.next([...currentItems]);
            }
            this.clearError();
            observer.next(result as Book);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Get books by category
   */
  getBooksByCategory(category: string): Observable<Book[]> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .eq('category', category)
        .order('title', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as Book[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get books by country
   */
  getBooksByCountry(countryId: number): Observable<Book[]> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .eq('country_id', countryId)
        .order('title', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as Book[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Search books
   */
  searchBooks(query: string): Observable<Book[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select('*')
        .or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`)
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Book[]);
            this.clearError();
            observer.next(data as Book[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  // ==================== BOOK IMAGES ====================

  /**
   * Add image to book
   */
  addBookImage(bookId: number, imageUrl: string, caption?: string): Observable<BookImage> {
    return new Observable(observer => {
      this.supabase.client
        .from('book_images')
        .insert({
          book_id: bookId,
          image_url: imageUrl,
          caption: caption
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as BookImage);
            observer.complete();
          }
        });
    });
  }

  /**
   * Delete book image
   */
  deleteBookImage(imageId: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('book_images')
        .delete()
        .eq('id', imageId)
        .then(({ error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next();
            observer.complete();
          }
        });
    });
  }

  // ==================== INVENTORY ====================

  /**
   * Get current stock for a book
   */
  getBookStock(bookId: number): Observable<number> {
    return new Observable(observer => {
      this.supabase.client
        .from('inventory_log')
        .select('type, quantity')
        .eq('book_id', bookId)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const logs = data as InventoryLog[];
            const stock = logs.reduce((total: number, log: InventoryLog) => {
              return log.type === 'in' ? total + log.quantity : total - log.quantity;
            }, 0);
            observer.next(stock);
            observer.complete();
          }
        });
    });
  }

  /**
   * Add to inventory
   */
  addToInventory(
    bookId: number,
    quantity: number,
    referenceType?: string,
    referenceId?: string,
    notes?: string
  ): Observable<InventoryLog> {
    return new Observable(observer => {
      this.supabase.client
        .from('inventory_log')
        .insert({
          book_id: bookId,
          type: 'in',
          quantity: quantity,
          reference_type: referenceType,
          reference_id: referenceId,
          notes: notes
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as InventoryLog);
            observer.complete();
          }
        });
    });
  }

  /**
   * Remove from inventory
   */
  removeFromInventory(
    bookId: number,
    quantity: number,
    referenceType?: string,
    referenceId?: string,
    notes?: string
  ): Observable<InventoryLog> {
    return new Observable(observer => {
      this.supabase.client
        .from('inventory_log')
        .insert({
          book_id: bookId,
          type: 'out',
          quantity: quantity,
          reference_type: referenceType,
          reference_id: referenceId,
          notes: notes
        } as any)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as InventoryLog);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get inventory movements for a book
   */
  getInventoryLog(bookId: number, limit: number = 50): Observable<InventoryLog[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('inventory_log')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as InventoryLog[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get books with low stock
   */
  getLowStockBooks(threshold: number = 10): Observable<Array<Book & { stock: number }>> {
    return new Observable(observer => {
      // يحتاج دالة RPC للحساب
      this.supabase.rpc('get_low_stock_books', { threshold_qty: threshold })
        .subscribe({
          next: (data: any) => observer.next(data),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
    });
  }

  // ==================== PRICING ====================

  /**
   * Get book price by currency
   */
  getBookPrice(book: Book, currency: Currency): number {
    switch (currency) {
      case 'USD': return book.price_usd || 0;
      case 'AED': return book.price_aed || 0;
      case 'QR': return book.price_qr || 0;
      case 'SYP': return book.price_syp || 0;
      default: return book.price_usd || 0;
    }
  }

  /**
   * Calculate profit per book
   */
  calculateProfit(book: Book, currency: Currency): number {
    const price = this.getBookPrice(book, currency);
    const cost = currency === 'SYP' ? (book.cost_syp || 0) : (book.cost_usd || 0);
    return price - cost;
  }

  /**
   * Calculate profit margin
   */
  calculateProfitMargin(book: Book, currency: Currency): number {
    const price = this.getBookPrice(book, currency);
    if (price === 0) return 0;
    const profit = this.calculateProfit(book, currency);
    return (profit / price) * 100;
  }

  // ==================== STATISTICS ====================

  /**
   * Get book sales statistics
   */
  getBookStats(bookId: number): Observable<{
    totalSold: number;
    totalRevenue: number;
    currentStock: number;
    averagePrice: number;
  }> {
    return this.supabase.rpc('get_book_stats', { book_id: bookId });
  }

  /**
   * Get top selling books
   */
  getTopSellingBooks(limit: number = 10): Observable<Array<Book & { totalSold: number }>> {
    return this.supabase.rpc('get_top_selling_books', { limit_count: limit });
  }

  // ==================== VALIDATION ====================

  /**
   * Check if ISBN exists
   */
  async isISBNExists(isbn: string, excludeBookId?: number): Promise<boolean> {
    let query = this.supabase.client
      .from(this.tableName)
      .select('book_id')
      .eq('isbn', isbn);

    if (excludeBookId) {
      query = query.neq('book_id', excludeBookId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  }

  // ==================== EXPORT ====================

  /**
   * Get books for export
   */
  getBooksForExport(): Observable<any[]> {
    return this.getBooksWithRelations().pipe(
      map((books: Book[]) =>
        books.map(b => ({
          'العنوان': b.title,
          'المؤلف': b.author || '-',
          'الناشر': b.publisher || '-',
          'ISBN': b.isbn || '-',
          'الفئة': b.category || '-',
          'السنة': b.year || '-',
          'السعر (دولار)': b.price_usd || 0,
          'التكلفة (دولار)': b.cost_usd || 0,
          'البلد': b.country?.name || '-',
          'تاريخ الإضافة': new Date(b.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }
}
