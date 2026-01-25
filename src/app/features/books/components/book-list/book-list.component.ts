// src/app/features/books/components/book-list/book-list.component.ts
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

  // فلاتر إضافية
  selectedCategory: string = '';
  selectedCountry: number | null = null;
  categories: string[] = [];
  countries: any[] = [];

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.loading = true;
    this.booksService.getBooksWithRelations().subscribe({
      next: (data) => {
        this.books = data;
        this.filteredBooks = data;
        this.extractFilters(data);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading books:', error);
        alert('حدث خطأ أثناء تحميل الكتب');
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  extractFilters(books: Book[]): void {
    // استخراج الفئات الفريدة
    this.categories = [...new Set(books.map(b => b.category).filter(c => c))];

    // استخراج الدول الفريدة
    const countryMap = new Map();
    books.forEach(b => {
      if (b.country) {
        countryMap.set(b.country.id, b.country);
      }
    });
    this.countries = Array.from(countryMap.values());
  }

  applyFilters(): void {
    let filtered = [...this.books];

    // فلتر البحث
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author?.toLowerCase().includes(query) ||
        b.isbn?.includes(query)
      );
    }

    // فلتر الفئة
    if (this.selectedCategory) {
      filtered = filtered.filter(b => b.category === this.selectedCategory);
    }

    // فلتر الدولة
    if (this.selectedCountry) {
      filtered = filtered.filter(b => b.country_id === this.selectedCountry);
    }

    this.filteredBooks = filtered;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedCountry = null;
    this.applyFilters();
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

  // ==================== تصدير Excel ====================

  exportToExcel(): void {
    const exportData = this.filteredBooks.map(book => ({
      'رقم الكتاب': this.toEnglishNumbers(book.book_id),
      'العنوان': book.title,
      'المؤلف': book.author || '-',
      'الناشر': book.publisher || '-',
      'ISBN': book.isbn || '-',
      'الفئة': book.category || '-',
      'السنة': book.year ? this.toEnglishNumbers(book.year) : '-',
      'الدولة': book.country?.name || '-',
      'السعر (USD)': this.toEnglishNumbers((book.price_usd || 0).toFixed(2)),
      'السعر (SYP)': this.toEnglishNumbers((book.price_syp || 0).toLocaleString('en-US')),
      'السعر (AED)': this.toEnglishNumbers((book.price_aed || 0).toFixed(2)),
      'السعر (QR)': this.toEnglishNumbers((book.price_qr || 0).toFixed(2)),
      'التكلفة (USD)': this.toEnglishNumbers((book.cost_usd || 0).toFixed(2)),
      'التكلفة (SYP)': this.toEnglishNumbers((book.cost_syp || 0).toLocaleString('en-US')),
      'الكمية المتوفرة': this.toEnglishNumbers(book.stock_quantity || 0),
      'الطول (cm)': book.height_cm ? this.toEnglishNumbers(book.height_cm) : '-',
      'العرض (cm)': book.width_cm ? this.toEnglishNumbers(book.width_cm) : '-',
      'نوع الغلاف': book.cover_type || '-',
      'عدد الصفحات': book.pages ? this.toEnglishNumbers(book.pages) : '-',
      'تاريخ الإضافة': new Date(book.created_at).toLocaleDateString('ar-SA')
    }));

    this.excelService.exportToExcel(
      exportData,
      'قائمة_الكتب',
      'الكتب'
    );
  }

  exportCurrentView(): void {
    if (this.filteredBooks.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }
    this.exportToExcel();
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
    return `$${this.toEnglishNumbers(usd.toFixed(2))} / ${this.toEnglishNumbers(syp.toLocaleString('en-US'))} ل.س`;
  }

  toEnglishNumbers(str: string | number): string {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    let result = str.toString();
    arabicNumbers.forEach((arabic, index) => {
      result = result.replace(new RegExp(arabic, 'g'), englishNumbers[index]);
    });

    return result;
  }
}
