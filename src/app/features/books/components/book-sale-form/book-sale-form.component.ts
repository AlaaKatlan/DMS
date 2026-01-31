// src/app/features/books/components/book-sale-form/book-sale-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BooksService } from '../../books.service';
import { CustomersService } from '../../../customers/customers.service';
import { BookSalesService } from '../../book-sales.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-book-sale-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './book-sale-form.component.html',
  styleUrls: ['./book-sale-form.component.scss']
})
export class BookSaleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private salesService = inject(BookSalesService);
  private booksService = inject(BooksService);
  private customersService = inject(CustomersService);
  private authService = inject(AuthService);
  private router = inject(Router);

  invoiceForm!: FormGroup;
  books: any[] = [];
  customers: any[] = [];
  submitting = false;
  invoiceNumber = '';

  currentUser = this.authService.currentUser;

  ngOnInit() {
    this.initForm();
    this.loadData();
    this.generateInvoiceNumber();
  }

  initForm() {
    this.invoiceForm = this.fb.group({
      invoice_number: ['', Validators.required],
      customer_id: [null],
      customer_name: [''],
      seller_id: [this.currentUser?.id],
      seller_name: [this.currentUser?.full_name_p],
      payment_method: ['cash', Validators.required],
      sale_date: [new Date().toISOString().split('T')[0], Validators.required],
      notes: [''],
      items: this.fb.array([]) // ✅ مصفوفة الأصناف
    });

    // إضافة صنف افتراضي
    this.addItem();

    // حساب الإجمالي عند تغيير الأصناف
    this.items.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  // ✅ Getter للأصناف
  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  // ✅ إنشاء صنف جديد
  createItemFormGroup(): FormGroup {
    return this.fb.group({
      book_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price_syp: [0],
      total_syp: [0],
      notes: ['']
    });
  }

  // ✅ إضافة صنف
  addItem() {
    this.items.push(this.createItemFormGroup());
  }

  // ✅ حذف صنف
  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    } else {
      alert('يجب أن يحتوي على صنف واحد على الأقل');
    }
  }

  // ✅ عند تغيير الكتاب
  onBookChange(index: number) {
    const item = this.items.at(index);
    const bookId = item.get('book_id')?.value;

    if (bookId) {
      const book = this.books.find(b => b.book_id === +bookId);
      if (book) {
        item.patchValue({
          unit_price_syp: book.price_syp || 0
        }, { emitEvent: false });

        this.calculateItemTotal(index);
      }
    }
  }

  // ✅ حساب إجمالي صنف
  calculateItemTotal(index: number) {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unit_price_syp')?.value || 0;
    const total = quantity * unitPrice;

    item.patchValue({ total_syp: total }, { emitEvent: false });
    this.calculateTotals();
  }

  // ✅ حساب الإجماليات
  calculateTotals() {
    const subtotal = this.items.controls.reduce((sum, item) => {
      return sum + (item.get('total_syp')?.value || 0);
    }, 0);

    // يمكن إضافة خصم لاحقاً
    this.invoiceForm.patchValue({
      subtotal: subtotal,
      total: subtotal
    }, { emitEvent: false });
  }

  loadData() {
    this.booksService.getBooksWithRelations().subscribe(books => {
      this.books = books;
    });

    // @ts-ignore
    this.customersService.getCustomersLite?.().subscribe(customers => {
      this.customers = customers;
    });
  }

  generateInvoiceNumber() {
    this.salesService.generateInvoiceNumber().subscribe(number => {
      this.invoiceNumber = number;
      this.invoiceForm.patchValue({ invoice_number: number });
    });
  }

  onSubmit() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    if (this.items.length === 0) {
      alert('يجب إضافة صنف واحد على الأقل');
      return;
    }

    this.submitting = true;
    const formData = this.invoiceForm.getRawValue();

    // تحضير بيانات الفاتورة
    const invoiceData: any = {
      invoice_number: formData.invoice_number,
      customer_id: formData.customer_id,
      customer_name: formData.customer_name,
      seller_id: formData.seller_id,
      seller_name: formData.seller_name,
      subtotal: formData.items.reduce((sum: number, item: any) => sum + item.total_syp, 0),
      discount_amount: 0,
      discount_percentage: 0,
      total: formData.items.reduce((sum: number, item: any) => sum + item.total_syp, 0),
      payment_method: formData.payment_method,
      sale_date: formData.sale_date,
      notes: formData.notes
    };

    // تحضير الأصناف
    const items = formData.items.map((item: any) => ({
      book_id: item.book_id,
      quantity: item.quantity,
      unit_price_usd: 0,
      unit_price_syp: item.unit_price_syp,
      total_usd: 0,
      total_syp: item.total_syp,
      currency: 'SYP',
      notes: item.notes
    }));

    this.salesService.createSalesInvoice(invoiceData, items).subscribe({
      next: () => {
        alert('تم تسجيل الفاتورة بنجاح');
        this.router.navigate(['/books/sales']);
      },
      error: (err: any) => {
        console.error(err);
        alert('حدث خطأ أثناء حفظ الفاتورة');
        this.submitting = false;
      }
    });
  }

  getBookTitle(bookId: number): string {
    const book = this.books.find(b => b.book_id === bookId);
    return book ? book.title : '';
  }

  getTotalAmount(): number {
    return this.items.controls.reduce((sum, item) => {
      return sum + (item.get('total_syp')?.value || 0);
    }, 0);
  }
}
