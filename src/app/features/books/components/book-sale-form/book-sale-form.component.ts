// src/app/features/books/components/book-sale-form/book-sale-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
 import { BooksService } from '../../books.service';
import { CustomersService } from '../../../customers/customers.service';
import { Book, Customer } from '../../../../core/models/base.model';
import { BookSalesService } from '../../book-sales.service';

@Component({
  selector: 'app-book-sale-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="sale-form-page" dir="rtl">
      <div class="form-container">
        <div class="form-header">
          <div class="header-content">
            <button type="button" routerLink="/books/sales" class="btn-back">
              <lucide-angular name="arrow-right" [size]="24"></lucide-angular>
            </button>
            <div class="title-group">
              <h2>تسجيل عملية بيع جديدة</h2>
              <p class="subtitle">إضافة بيع كتاب للنظام</p>
            </div>
          </div>

          <div class="header-actions">
            <button type="button" routerLink="/books/sales" class="btn btn-secondary">إلغاء</button>
            <button (click)="onSubmit()" [disabled]="saleForm.invalid || submitting" class="btn btn-primary">
              <lucide-angular *ngIf="submitting" name="loader-2" class="animate-spin" [size]="18"></lucide-angular>
              <span>{{ submitting ? 'جاري الحفظ...' : 'تسجيل البيع' }}</span>
            </button>
          </div>
        </div>

        <form [formGroup]="saleForm" class="form-content">
          <div class="card">
            <div class="card-header">
              <lucide-angular name="shopping-cart" [size]="20"></lucide-angular>
              <h3>تفاصيل البيع</h3>
            </div>

            <div class="card-body grid-2">
              <div class="form-group col-span-2">
                <label>الكتاب <span class="required">*</span></label>
                <select formControlName="book_id" (change)="onBookChange()">
                  <option [ngValue]="null">اختر الكتاب</option>
                  <option *ngFor="let book of books" [value]="book.book_id">
                    {{ book.title }} - {{ book.author }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>الكمية <span class="required">*</span></label>
                <input type="number" formControlName="quantity" min="1" (input)="calculateTotal()">
                <span class="hint" *ngIf="selectedBook">
                  المتوفر: {{ selectedBook.stock_quantity || 0 }}
                </span>
              </div>

              <div class="form-group">
                <label>العملة <span class="required">*</span></label>
                <select formControlName="currency" (change)="calculateTotal()">
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="SYP">ليرة سورية (SYP)</option>
                </select>
              </div>

              <div class="form-group">
                <label>سعر الوحدة ({{ saleForm.get('currency')?.value }})</label>
                <input type="number" formControlName="unit_price" step="0.01" min="0" readonly class="bg-gray-50">
              </div>

              <div class="form-group">
                <label>الإجمالي ({{ saleForm.get('currency')?.value }})</label>
                <input type="number" formControlName="total" step="0.01" readonly class="bg-gray-50 font-bold text-green-600">
              </div>

              <div class="form-group col-span-2">
                <label>العميل</label>
                <div class="customer-select-group">
                  <select formControlName="customer_id">
                    <option [ngValue]="null">عميل نقدي (بدون تسجيل)</option>
                    <option *ngFor="let customer of customers" [value]="customer.id">
                      {{ customer.name }}
                    </option>
                  </select>
                  <input
                    *ngIf="!saleForm.get('customer_id')?.value"
                    type="text"
                    formControlName="customer_name"
                    placeholder="اسم العميل (اختياري)"
                    class="mt-2"
                  >
                </div>
              </div>

              <div class="form-group">
                <label>طريقة الدفع <span class="required">*</span></label>
                <select formControlName="payment_method">
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="transfer">تحويل بنكي</option>
                </select>
              </div>

              <div class="form-group">
                <label>تاريخ البيع <span class="required">*</span></label>
                <input type="date" formControlName="sale_date">
              </div>

              <div class="form-group col-span-2">
                <label>ملاحظات</label>
                <textarea formControlName="notes" rows="2" placeholder="ملاحظات إضافية عن البيع..."></textarea>
              </div>
            </div>
          </div>

          <!-- Book Preview -->
          <div class="card" *ngIf="selectedBook">
            <div class="card-header">
              <lucide-angular name="info" [size]="20"></lucide-angular>
              <h3>معلومات الكتاب المحدد</h3>
            </div>
            <div class="card-body">
              <div class="book-preview">
                <img *ngIf="selectedBook.cover_image_url"
                     [src]="selectedBook.cover_image_url"
                     [alt]="selectedBook.title"
                     class="book-thumbnail">
                <div class="book-details">
                  <h4>{{ selectedBook.title }}</h4>
                  <p>المؤلف: {{ selectedBook.author || '-' }}</p>
                  <div class="price-info">
                    <span class="price-usd">$ {{ selectedBook.price_usd }}</span>
                    <span class="separator">|</span>
                    <span class="price-syp">{{ selectedBook.price_syp }} ل.س</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @use 'sass:color';
    $primary: #4F46E5;
    $bg-page: #F8FAFC;
    $white: #FFFFFF;
    $border: #E2E8F0;
    $text-main: #1E293B;
    $text-light: #64748B;
    $danger: #EF4444;

    :host { display: block; min-height: 100vh; background: $bg-page; padding: 2rem; }

    .sale-form-page { max-width: 900px; margin: 0 auto; }

    .form-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;

      .header-content {
        display: flex; align-items: center; gap: 1rem;
        .btn-back {
          width: 40px; height: 40px; border-radius: 50%; background: $white;
          border: 1px solid $border; display: flex; align-items: center;
          justify-content: center; cursor: pointer; color: $text-light;
          &:hover { color: $primary; border-color: $primary; }
        }
        .title-group {
          h2 { margin: 0; font-size: 1.5rem; color: $text-main; }
          .subtitle { margin: 0; color: $text-light; font-size: 0.9rem; margin-top: 2px; }
        }
      }

      .header-actions {
        display: flex; gap: 0.75rem;
        .btn {
          padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;
          cursor: pointer; border: none; display: flex; align-items: center; gap: 0.5rem;
          &-secondary { background: $white; border: 1px solid $border; color: $text-main; }
          &-primary { background: $primary; color: white; }
          &:disabled { opacity: 0.7; }
        }
      }
    }

    .card {
      background: $white; border-radius: 1rem; border: 1px solid $border;
      margin-bottom: 1.5rem; overflow: hidden;

      .card-header {
        padding: 1rem 1.5rem; border-bottom: 1px solid $border; background: #f8fafc;
        display: flex; align-items: center; gap: 0.75rem;
        h3 { margin: 0; font-size: 1rem; font-weight: 700; color: $text-main; }
      }

      .card-body { padding: 1.5rem; }
    }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .col-span-2 { grid-column: span 2; }

    .form-group {
      display: flex; flex-direction: column; gap: 0.5rem;
      label { font-size: 0.85rem; font-weight: 600; color: $text-main;
        .required { color: $danger; }
      }
      input, select, textarea {
        padding: 0.75rem; border: 1px solid $border; border-radius: 0.5rem;
        &:focus { outline: none; border-color: $primary; }
      }
      .hint { font-size: 0.75rem; color: $text-light; }
    }

    .book-preview {
      display: flex; gap: 1.5rem; align-items: flex-start;
      .book-thumbnail { width: 80px; height: 110px; object-fit: cover; border-radius: 8px; }
      .book-details {
        h4 { margin: 0 0 0.5rem; font-size: 1.125rem; color: $text-main; }
        p { margin: 0 0 0.75rem; color: $text-light; }
        .price-info {
          display: flex; gap: 0.75rem; font-weight: 700;
          .price-usd { color: #0284c7; }
          .price-syp { color: #059669; }
          .separator { color: $text-light; }
        }
      }
    }

    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class BookSaleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private salesService = inject(BookSalesService);
  private booksService = inject(BooksService);
  private customersService = inject(CustomersService);
  private router = inject(Router);

  saleForm!: FormGroup;
  books: Book[] = [];
  customers: Customer[] = [];
  selectedBook: Book | null = null;
  submitting = false;

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  initForm() {
    this.saleForm = this.fb.group({
      book_id: [null, Validators.required],
      customer_id: [null],
      customer_name: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      currency: ['USD', Validators.required],
      unit_price: [0],
      total: [0],
      payment_method: ['cash', Validators.required],
      sale_date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: ['']
    });
  }

  loadData() {
    this.booksService.getBooksWithRelations().subscribe(books => this.books = books);
    this.customersService.getCustomersLite().subscribe(customers => this.customers = customers);
  }

  onBookChange() {
    const bookId = this.saleForm.get('book_id')?.value;
    if (bookId) {
      this.selectedBook = this.books.find(b => b.book_id === +bookId) || null;
      if (this.selectedBook) {
        this.calculateTotal();
      }
    }
  }

  calculateTotal() {
    if (!this.selectedBook) return;

    const currency = this.saleForm.get('currency')?.value;
    const quantity = this.saleForm.get('quantity')?.value || 0;

    const unitPrice = currency === 'USD'
      ? (this.selectedBook.price_usd || 0)
      : (this.selectedBook.price_syp || 0);

    const total = unitPrice * quantity;

    this.saleForm.patchValue({
      unit_price: unitPrice,
      total: total
    }, { emitEvent: false });
  }

  onSubmit() {
    if (this.saleForm.invalid) {
      this.saleForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formData = this.saleForm.getRawValue();

    const saleData = {
      ...formData,
      unit_price_usd: formData.currency === 'USD' ? formData.unit_price : 0,
      unit_price_syp: formData.currency === 'SYP' ? formData.unit_price : 0,
      total_usd: formData.currency === 'USD' ? formData.total : 0,
      total_syp: formData.currency === 'SYP' ? formData.total : 0
    };

    this.salesService.createSale(saleData).subscribe({
      next: () => {
        alert('تم تسجيل عملية البيع بنجاح');
        this.router.navigate(['/books/sales']);
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء حفظ البيع');
        this.submitting = false;
      }
    });
  }
}
