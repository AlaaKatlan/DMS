import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BooksService } from '../../books.service';

import { LucideAngularModule } from 'lucide-angular';
import { Book, InventoryLog } from '../../../../core/models/base.model';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './book-detail.component.html'
})
export class BookDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private booksService = inject(BooksService);

  book: Book | null = null;
  inventoryLogs: InventoryLog[] = [];
  isLoading = true;
  activeTab: 'info' | 'inventory' = 'info';

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadBookData(+params['id']);
      }
    });
  }

  loadBookData(id: number) {
    this.isLoading = true;
    this.booksService.getBookDetail(id).subscribe({
      next: (data) => {
        this.book = data;
        this.loadInventoryLogs(id);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  loadInventoryLogs(bookId: number) {
    this.booksService.getInventoryLog(bookId).subscribe({
      next: (logs) => {
        this.inventoryLogs = logs;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }
}
