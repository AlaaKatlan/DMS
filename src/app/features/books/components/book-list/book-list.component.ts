import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BooksService } from '../../books.service';
import { Book } from '../../../../core/models/base.model';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';

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
  private excelService = inject(ExcelExportService);

  books: Book[] = [];
  filteredBooks: Book[] = [];
  loading = false;
  searchQuery = '';
  viewMode: 'grid' | 'list' = 'grid';

  // ✅ تعريف المتغيرات المفقودة
  selectedCategory: string = '';
  selectedCountry: number | null = null;
  categories: string[] = [];
  countries: any[] = [];

  ngOnInit(): void {
    this.loadBooks();
    // إذا كان لديك دالة لجلب الدول، استدعها هنا
    // this.loadCountries();
  }

  loadBooks(): void {
    this.loading = true;
    this.booksService.getBooksWithRelations().subscribe({
      next: (data) => {
        this.books = data;
        this.filteredBooks = data;

        // ✅ إصلاح خطأ النوع في categories
        this.categories = [...new Set(
          this.books
            .map(b => b.category)
            .filter((c): c is string => !!c)
        )];

        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.books];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author?.toLowerCase().includes(query) ||
        b.isbn?.includes(query)
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(b => b.category === this.selectedCategory);
    }

    if (this.selectedCountry) {
      filtered = filtered.filter(b => b.country_id === this.selectedCountry);
    }

    this.filteredBooks = filtered;
  }

  // ✅ إضافة الدالة المفقودة
  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedCountry = null;
    this.applyFilters();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  deleteBook(book: Book): void {
    if (confirm(`هل أنت متأكد من حذف كتاب "${book.title}"؟`)) {
      // ✅ استخدام book_id بدلاً من id
      // ملاحظة: book_id هو رقم، بينما delete في BaseService قد تتوقع string، لذا نقوم بالتحويل
      const idToDelete = book.book_id ? book.book_id.toString() : book.book_id;

      this.booksService.delete(idToDelete).subscribe({
        next: () => {
          this.books = this.books.filter(b => b.book_id !== book.book_id);
          this.applyFilters();
          alert('تم الحذف بنجاح');
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  // ==================== Export ====================

  exportCurrentView(): void {
    if (this.filteredBooks.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = this.filteredBooks.map(book => ({
      'العنوان': book.title,
      'المؤلف': book.author || '-',
      'الناشر': book.publisher || '-',
      'ISBN': book.isbn || '-',
      'التصنيف': book.category || '-',
      'السعر (USD)': this.toEnglishNumbers((book.price_usd || 0).toFixed(2)),
      'السعر (SYP)': this.toEnglishNumbers((book.price_syp || 0).toLocaleString('en-US')),
      'الكمية': this.getStockStatus(book.stock_quantity || 0),
      'عدد الصفحات': book.pages ? this.toEnglishNumbers(book.pages) : '-',
      'تاريخ الإضافة': new Date(book.created_at).toLocaleDateString('ar-SA')
    }));

    this.excelService.exportToExcel(
      exportData,
      'قائمة_الكتب',
      'الكتب'
    );
  }

  // ==================== Helpers ====================

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

  formatDualPrice(book: Book): string {
    const usd = book.price_usd || 0;
    const syp = book.price_syp || 0;
    return `$${this.toEnglishNumbers(usd.toFixed(2))} / ${this.toEnglishNumbers(syp.toLocaleString('en-US'))} SYP`;
  }

  toEnglishNumbers(str: any): string {
    if (!str) return '0';
    return str.toString().replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  }
}
