import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BooksService } from '../../books.service';
import { Book } from '../../../../core/models/base.model';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './book-detail.component.html',
  styleUrls: ['./book-detail.component.scss']
})
export class BookDetailComponent implements OnInit {
  private booksService = inject(BooksService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  book: Book | null = null;
  loading = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBook(id);
    } else {
      this.router.navigate(['/books']);
    }
  }

  loadBook(id: string): void {
    this.loading = true;
    this.booksService.getBookDetail(+id).subscribe({
      next: (data) => {
        // تأخير بسيط لضمان استقرار العرض (حل مشكلة NG0100 المحتملة)
        setTimeout(() => {
          this.book = data;
          this.loading = false;
          this.cd.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading book:', err);
        this.loading = false;
        this.router.navigate(['/books']);
      }
    });
  }

  deleteBook(): void {
    if (!this.book) return;

    if (confirm(`هل أنت متأكد من حذف كتاب: "${this.book.title}"؟`)) {
      this.booksService.delete(this.book.book_id).subscribe({
        next: () => {
          alert('تم حذف الكتاب بنجاح');
          this.router.navigate(['/books']);
        },
        error: (err) => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  getStockStatus(qty: number): string {
    if (qty <= 0) return 'نفذت الكمية';
    if (qty < 10) return 'منخفض';
    return 'متوفر';
  }

  getStockClass(qty: number): string {
    if (qty <= 0) return 'bg-red-100 text-red-700';
    if (qty < 10) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }
}
