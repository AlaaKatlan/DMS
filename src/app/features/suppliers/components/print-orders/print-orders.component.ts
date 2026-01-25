import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuppliersService } from '../../suppliers.service';
import { BooksService } from '../../../books/books.service'; // تأكد من المسار
import { PurchaseOrder } from '../../models/supplier.model';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-print-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './print-orders.component.html',
  styleUrls: ['./print-orders.component.scss']
})
export class PrintOrdersComponent implements OnInit {
  @Input() supplierId!: string;

  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private booksService = inject(BooksService);

  orders: PurchaseOrder[] = [];
  books: any[] = [];
  showForm = false;
  isSubmitting = false;

  poForm: FormGroup = this.fb.group({
    order_number: [`PO-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`, Validators.required],
    order_date: [new Date().toISOString().split('T')[0], Validators.required],
    currency: ['USD', Validators.required],
    status: ['draft'],
    notes: [''],
    lines: this.fb.array([])
  });

  ngOnInit() {
    if (this.supplierId) {
      this.loadOrders();
      this.loadBooks();
    }
  }

  loadOrders() {
    this.suppliersService.getSupplierOrders(this.supplierId).subscribe(data => this.orders = data);
  }

  // ✅ الآن ستعمل هذه الدالة لأننا أضفناها في الخدمة
  loadBooks() {
    this.booksService.getBooks().subscribe((data: any) => this.books = data || []);
  }

  get lines() {
    return this.poForm.get('lines') as FormArray;
  }

  addLine() {
    const line = this.fb.group({
      book_id: [null, Validators.required],
      description: ['', Validators.required],
      quantity: [2000, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      total: [0]
    });

    line.valueChanges.subscribe(val => {
      const tot = (val.quantity || 0) * (val.unit_price || 0);
      if (line.get('total')?.value !== tot) {
        line.patchValue({ total: tot }, { emitEvent: false });
      }
    });

    this.lines.push(line);
  }

  onBookSelect(index: number) {
    const line = this.lines.at(index);
    const bookId = line.get('book_id')?.value;
    const book = this.books.find(b => b.book_id == bookId);

    if (book) {
      const currency = this.poForm.get('currency')?.value;
      const price = currency === 'USD' ? (book.cost_usd || 0) : (book.cost_syp || 0);

      line.patchValue({
        description: book.title,
        unit_price: price
      });
    }
  }

  removeLine(index: number) {
    this.lines.removeAt(index);
  }

  get grandTotal(): number {
    return this.lines.controls.reduce((acc, c) => acc + (c.get('total')?.value || 0), 0);
  }

  submitOrder() {
    if (this.poForm.invalid || this.lines.length === 0) {
      this.poForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;

    const formValue = this.poForm.value;
    const poData = {
      supplier_id: this.supplierId,
      order_number: formValue.order_number,
      status: formValue.status,
      currency: formValue.currency,
      order_date: formValue.order_date,
      total_amount: this.grandTotal,
      notes: formValue.notes
    };

    this.suppliersService.createPurchaseOrder(poData, formValue.lines).subscribe({
      next: () => {
        alert('تم الحفظ بنجاح');
        this.showForm = false;
        this.poForm.reset();
        this.lines.clear();
        this.loadOrders();
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error(err);
        alert('خطأ في الحفظ');
        this.isSubmitting = false;
      }
    });
  }
}
