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
      subtotal: [0],
      discount_amount: [0],
      discount_percentage: [0],
      total: [0],
      items: this.fb.array([])
    });

    this.addItem();
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      book_id: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price_syp: [0],
      discount_percentage: [0, [Validators.min(0), Validators.max(100)]], // الحقل الجديد
      total_syp: [0],
      notes: ['']
    });
  }

  addItem() {
    this.items.push(this.createItemFormGroup());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.calculateTotals();
    }
  }

  onBookChange(index: number) {
    const item = this.items.at(index);
    const bookId = item.get('book_id')?.value;
    if (bookId) {
      const book = this.books.find(b => b.book_id === +bookId);
      if (book) {
        item.patchValue({ unit_price_syp: book.price_syp || 0 }, { emitEvent: false });
        this.calculateItemTotal(index);
      }
    }
  }

  // حساب إجمالي السطر مع الحسم
  calculateItemTotal(index: number) {
    const item = this.items.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unit_price_syp')?.value || 0;
    const discountPercent = item.get('discount_percentage')?.value || 0;

    const priceAfterDisc = unitPrice * (1 - (discountPercent / 100));
    const total = quantity * priceAfterDisc;

    item.patchValue({ total_syp: Math.round(total) }, { emitEvent: false });
    this.calculateTotals();
  }

  // تطبيق حسم شامل على كافة الأسطر
  applyGlobalDiscount(percent: number) {
    this.items.controls.forEach((_, index) => {
      this.items.at(index).get('discount_percentage')?.setValue(percent);
      this.calculateItemTotal(index);
    });
  }

  calculateTotals() {
    const subtotal = this.items.controls.reduce((sum, item) => sum + (item.get('quantity')?.value * item.get('unit_price_syp')?.value || 0), 0);
    const totalAfterItemDiscounts = this.items.controls.reduce((sum, item) => sum + (item.get('total_syp')?.value || 0), 0);

    this.invoiceForm.patchValue({
      subtotal: subtotal,
      discount_amount: subtotal - totalAfterItemDiscounts,
      total: totalAfterItemDiscounts
    }, { emitEvent: false });
  }

  loadData() {
    this.booksService.getBooksWithRelations().subscribe(books => this.books = books);
    this.customersService.getCustomersLite?.().subscribe(customers => this.customers = customers);
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
      return;
    }

    this.submitting = true;
    const formData = this.invoiceForm.getRawValue();

    const invoiceData = {
      ...formData,
      items: undefined // نفصله للإرسال المنفصل
    };

    const items = formData.items.map((item: any) => ({
      ...item,
      unit_price_after_discount_syp: Math.round(item.unit_price_syp * (1 - (item.discount_percentage / 100))),
      currency: 'SYP'
    }));

    this.salesService.createSalesInvoice(invoiceData, items).subscribe({
      next: () => {
        alert('تم تسجيل الفاتورة بنجاح');
        this.router.navigate(['/books/sales']);
      },
      error: (err) => {
        console.error(err);
        this.submitting = false;
      }
    });
  }
}
