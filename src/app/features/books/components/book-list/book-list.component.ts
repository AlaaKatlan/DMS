// src/app/features/books/components/book-list/book-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BooksService } from '../../books.service';
import { Book } from '../../../../core/models/base.model';

@Component({
  selector: 'app-book-list',
  standalone: true, // تأكد من وجود هذا
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.scss']
})
export class BookListComponent implements OnInit {
  private booksService = inject(BooksService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef); // لحل مشكلة التحديث

  books: Book[] = [];
  filteredBooks: Book[] = [];
  loading = false;
  searchQuery = '';
  viewMode: 'grid' | 'list' = 'grid';

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
        this.cd.detectChanges(); // تحديث الواجهة فوراً
      },
      error: (error) => {
        console.error('Error loading books:', error);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
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
      this.booksService.delete(book.book_id).subscribe({ // انتبه: book_id وليس id
        next: () => {
          this.loadBooks(); // إعادة التحميل بعد الحذف
        },
        error: (err) => alert('حدث خطأ أثناء الحذف')
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
}
