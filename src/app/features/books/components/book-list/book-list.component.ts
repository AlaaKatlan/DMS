// src/app/features/books/components/book-list/book-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BooksService } from '../../books.service';
import { Book } from '../../../../core/models/base.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.scss']
})
export class BookListComponent implements OnInit {
  private booksService = inject(BooksService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  books: Book[] = [];
  filteredBooks: Book[] = [];
  loading = false;
  searchQuery = '';
  viewMode: 'grid' | 'list' = 'grid';

  // المخزون - سيتم تفعيله لاحقاً
  bookStocks: Map<number, number> = new Map();
  loadingStocks = false;

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.loading = true;
    this.booksService.getBooksWithRelations().subscribe({
      next: (data) => {
        this.books = data;
        this.filteredBooks = data;
        this.loading = false;
        this.cd.detectChanges();

        // يمكن تفعيل تحميل المخزون هنا إذا أردت
        // this.loadBookStocks();
      },
      error: (error) => {
        console.error('Error loading books:', error);
        alert('حدث خطأ أثناء تحميل الكتب');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  /**
   * تحميل كميات المخزون لجميع الكتب
   * يمكن تفعيله عند الحاجة
   */
  loadBookStocks(): void {
    if (this.books.length === 0) return;

    this.loadingStocks = true;

    // جلب المخزون لجميع الكتب دفعة واحدة
    const stockRequests = this.books.map(book =>
      this.booksService.getBookStock(book.book_id)
    );

    forkJoin(stockRequests).subscribe({
      next: (stocks) => {
        this.books.forEach((book, index) => {
          this.bookStocks.set(book.book_id, stocks[index]);
        });
        this.loadingStocks = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading stocks:', error);
        this.loadingStocks = false;
      }
    });
  }

  /**
   * الحصول على كمية المخزون لكتاب معين
   */
  getBookStock(bookId: number): number {
    return this.bookStocks.get(bookId) || 0;
  }

  applyFilters(): void {
    if (!this.searchQuery.trim()) {
      this.filteredBooks = [...this.books];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredBooks = this.books.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author?.toLowerCase().includes(query) ||
        b.isbn?.includes(query)
      );
    }
  }

  deleteBook(book: Book): void {
    if (confirm(`هل أنت متأكد من حذف كتاب: ${book.title}؟`)) {
      this.booksService.delete(book.book_id).subscribe({
        next: () => {
          alert('تم حذف الكتاب بنجاح');
          this.loadBooks();
        },
        error: (err) => {
          console.error('Error deleting book:', err);
          alert('حدث خطأ أثناء حذف الكتاب');
        }
      });
    }
  }

  // Helper methods for template
  getStockStatus(quantity: number): string {
    if (quantity <= 0) return 'نفذت الكمية';
    if (quantity < 10) return 'منخفض';
    return 'متوفر';
  }

  getStockClass(quantity: number): string {
    if (quantity <= 0) return 'bg-red-100 text-red-800';
    if (quantity < 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }

  /**
   * تنسيق السعر
   */
  formatPrice(amount: number | undefined, currency: string = 'USD'): string {
    if (!amount) return '-';

    const symbols: Record<string, string> = {
      USD: '$',
      AED: 'د.إ',
      QR: 'ر.ق',
      SYP: 'ل.س'
    };

    return `${symbols[currency] || ''} ${amount.toLocaleString('ar-SA')}`;
  }
}
