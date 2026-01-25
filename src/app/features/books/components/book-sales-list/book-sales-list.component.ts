// src/app/features/books/components/book-sales-list/book-sales-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BookSale, BookSalesService } from '../../book-sales.service';

@Component({
  selector: 'app-book-sales-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  template: `
    <div class="sales-page" dir="rtl">
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">مبيعات الكتب</h1>
          <p class="page-subtitle">إدارة ومتابعة عمليات البيع</p>
        </div>
        <button routerLink="/books/sales/new" class="btn btn-primary">
          <lucide-angular name="plus" [size]="20"></lucide-angular>
          <span>تسجيل بيع جديد</span>
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon usd">
            <lucide-angular name="dollar-sign" [size]="24"></lucide-angular>
          </div>
          <div class="stat-info">
            <span class="stat-label">إجمالي المبيعات (USD)</span>
            <span class="stat-value">$ {{ toEnglishNumbers(totalSalesUSD.toFixed(2)) }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon syp">
            <lucide-angular name="banknote" [size]="24"></lucide-angular>
          </div>
          <div class="stat-info">
            <span class="stat-label">إجمالي المبيعات (SYP)</span>
            <span class="stat-value">{{ toEnglishNumbers(totalSalesSYP.toLocaleString('en-US')) }} ل.س</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon books">
            <lucide-angular name="book-open" [size]="24"></lucide-angular>
          </div>
          <div class="stat-info">
            <span class="stat-label">عدد الكتب المباعة</span>
            <span class="stat-value">{{ toEnglishNumbers(totalBooksSold) }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon count">
            <lucide-angular name="shopping-cart" [size]="24"></lucide-angular>
          </div>
          <div class="stat-info">
            <span class="stat-label">عدد العمليات</span>
            <span class="stat-value">{{ toEnglishNumbers(sales.length) }}</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-section">
        <div class="search-box">
          <lucide-angular name="search" [size]="20"></lucide-angular>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()"
                 placeholder="ابحث بعنوان الكتاب أو اسم العميل...">
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <div class="spinner"></div>
        <p>جاري تحميل المبيعات...</p>
      </div>

      <!-- Sales Table -->
      <div *ngIf="!loading && filteredSales.length > 0" class="sales-table">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الكتاب</th>
              <th>العميل</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
              <th>طريقة الدفع</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sale of filteredSales">
              <td>{{ sale.sale_date | date:'dd/MM/yyyy' }}</td>
              <td class="book-cell">
                <div class="book-info">
                  <img *ngIf="sale.book?.cover_image_url"
                       [src]="sale.book.cover_image_url"
                       class="book-thumb">
                  <div>
                    <div class="book-title">{{ sale.book?.title || 'كتاب محذوف' }}</div>
                    <div class="book-author">{{ sale.book?.author }}</div>
                  </div>
                </div>
              </td>
              <td>{{ sale.customer?.name || sale.customer_name || 'عميل نقدي' }}</td>
              <td class="qty-cell">{{ toEnglishNumbers(sale.quantity) }}</td>
              <td class="price-cell">
                <span *ngIf="sale.currency === 'USD'" class="usd">
                  $ {{ toEnglishNumbers(sale.unit_price_usd.toFixed(2)) }}
                </span>
                <span *ngIf="sale.currency === 'SYP'" class="syp">
                  {{ toEnglishNumbers(sale.unit_price_syp.toLocaleString('en-US')) }} ل.س
                </span>
              </td>
              <td class="total-cell">
                <span *ngIf="sale.currency === 'USD'" class="usd">
                  $ {{ toEnglishNumbers(sale.total_usd.toFixed(2)) }}
                </span>
                <span *ngIf="sale.currency === 'SYP'" class="syp">
                  {{ toEnglishNumbers(sale.total_syp.toLocaleString('en-US')) }} ل.س
                </span>
              </td>
              <td>
                <span class="payment-badge" [ngClass]="sale.payment_method">
                  {{ getPaymentLabel(sale.payment_method) }}
                </span>
              </td>
              <td>
                <button class="btn-delete" (click)="deleteSale(sale.id)" title="حذف">
                  <lucide-angular name="trash-2" [size]="16"></lucide-angular>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredSales.length === 0" class="empty-state">
        <lucide-angular name="shopping-cart" [size]="64"></lucide-angular>
        <h3>لا توجد مبيعات</h3>
        <p>{{ searchQuery ? 'لا توجد نتائج' : 'ابدأ بتسجيل أول عملية بيع' }}</p>
        <button *ngIf="!searchQuery" routerLink="/books/sales/new" class="btn btn-primary">
          تسجيل بيع جديد
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use 'sass:color';
    $primary: #4F46E5;
    $bg-page: #F8FAFC;
    $white: #FFFFFF;
    $border: #E2E8F0;

    :host { display: block; background: $bg-page; min-height: 100vh; padding: 2rem; }

    .sales-page { max-width: 1400px; margin: 0 auto; }

    .page-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
      .page-title { font-size: 1.875rem; font-weight: 800; margin: 0 0 0.5rem; }
      .page-subtitle { color: #6b7280; margin: 0; }
    }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }

    .stat-card {
      background: $white; padding: 1.5rem; border-radius: 12px;
      border: 1px solid $border; display: flex; gap: 1rem; align-items: center;

      .stat-icon {
        width: 50px; height: 50px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;

        &.usd { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #0284c7; }
        &.syp { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
        &.books { background: linear-gradient(135deg, #fce7f3, #fbcfe8); color: #db2777; }
        &.count { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
      }

      .stat-info {
        display: flex; flex-direction: column;
        .stat-label { font-size: 0.875rem; color: #6b7280; }
        .stat-value { font-size: 1.5rem; font-weight: 800; font-family: monospace; }
      }
    }

    .search-section { margin-bottom: 2rem; }
    .search-box {
      display: flex; align-items: center; gap: 0.75rem; background: $white;
      padding: 0.75rem 1rem; border-radius: 12px; border: 1px solid $border;
      max-width: 500px;

      input { flex: 1; border: none; outline: none; }
    }

    .sales-table {
      background: $white; border-radius: 12px; border: 1px solid $border; overflow: hidden;

      table { width: 100%; border-collapse: collapse; }

      thead {
        background: #f8fafc; border-bottom: 1px solid $border;
        th { padding: 1rem; text-align: right; font-size: 0.875rem;
             font-weight: 700; color: #6b7280; }
      }

      tbody {
        tr { border-bottom: 1px solid #f3f4f6; &:hover { background: #f9fafb; } }
        td { padding: 1rem; }
      }

      .book-cell {
        .book-info {
          display: flex; gap: 0.75rem; align-items: center;
          .book-thumb { width: 40px; height: 55px; object-fit: cover; border-radius: 4px; }
          .book-title { font-weight: 600; }
          .book-author { font-size: 0.875rem; color: #6b7280; }
        }
      }

      .qty-cell { font-weight: 700; text-align: center; }
      .price-cell, .total-cell {
        font-family: monospace; font-weight: 700;
        .usd { color: #0284c7; }
        .syp { color: #059669; }
      }

      .payment-badge {
        padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
        &.cash { background: #dcfce7; color: #166534; }
        &.card { background: #dbeafe; color: #1e40af; }
        &.transfer { background: #fef3c7; color: #92400e; }
      }

      .btn-delete {
        background: transparent; border: none; color: #6b7280; cursor: pointer;
        padding: 0.5rem; border-radius: 6px;
        &:hover { background: #fef2f2; color: #dc2626; }
      }
    }

    .empty-state {
      text-align: center; padding: 4rem; background: $white;
      border-radius: 12px; border: 2px dashed $border;

      lucide-angular { color: #d1d5db; margin-bottom: 1rem; }
      h3 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #6b7280; margin-bottom: 1.5rem; }
    }

    .loading-container {
      text-align: center; padding: 4rem;
      .spinner { margin: 0 auto 1rem; width: 40px; height: 40px;
                 border: 3px solid #e5e7eb; border-top-color: $primary;
                 border-radius: 50%; animation: spin 0.8s linear infinite; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 12px;
           font-weight: 600; cursor: pointer; display: inline-flex;
           align-items: center; gap: 0.5rem; }
    .btn-primary { background: $primary; color: white; }
  `]
})
export class BookSalesListComponent implements OnInit {
  private salesService = inject(BookSalesService);

  sales: BookSale[] = [];
  filteredSales: BookSale[] = [];
  loading = false;
  searchQuery = '';

  totalSalesUSD = 0;
  totalSalesSYP = 0;
  totalBooksSold = 0;

  ngOnInit() {
    this.loadSales();
  }

  loadSales() {
    this.loading = true;
    this.salesService.getSalesWithDetails().subscribe({
      next: (data) => {
        this.sales = data;
        this.filteredSales = data;
        this.calculateStats();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  calculateStats() {
    this.totalSalesUSD = this.sales.reduce((sum, s) => sum + s.total_usd, 0);
    this.totalSalesSYP = this.sales.reduce((sum, s) => sum + s.total_syp, 0);
    this.totalBooksSold = this.sales.reduce((sum, s) => sum + s.quantity, 0);
  }

  applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredSales = [...this.sales];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredSales = this.sales.filter(s =>
        s.book?.title?.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q)
      );
    }
  }

  deleteSale(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      this.salesService.deleteSale(id).subscribe({
        next: () => {
          alert('تم الحذف بنجاح');
          this.loadSales();
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  getPaymentLabel(method: string): string {
    const labels: any = { cash: 'نقدي', card: 'بطاقة', transfer: 'تحويل' };
    return labels[method] || method;
  }

  toEnglishNumbers(str: string | number): string {
    const arabicNumbers = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const englishNumbers = ['0','1','2','3','4','5','6','7','8','9'];
    let result = str.toString();
    arabicNumbers.forEach((arabic, index) => {
      result = result.replace(new RegExp(arabic, 'g'), englishNumbers[index]);
    });
    return result;
  }
}
