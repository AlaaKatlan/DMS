import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { SuppliersService } from '../../suppliers.service';
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

  orders: PurchaseOrder[] = [];
  showForm = false;
  isSubmitting = false;

  poForm: FormGroup = this.fb.group({
    order_number: [`PO-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`, Validators.required],
    status: ['draft', Validators.required],
    expected_delivery_date: [''],
    currency: ['USD', Validators.required],
    notes: [''],
    lines: this.fb.array([])
  });

  ngOnInit() {
    if (this.supplierId) {
      this.loadOrders();
    }
  }

  loadOrders() {
    this.suppliersService.getSupplierOrders(this.supplierId).subscribe(data => {
      this.orders = data;
    });
  }

  get lines() {
    return this.poForm.get('lines') as FormArray;
  }

  addLine() {
    const line = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      total: [0]
    });

    line.valueChanges.subscribe(val => {
      const total = (val.quantity || 0) * (val.unit_price || 0);
      if (val.total !== total) {
        line.patchValue({ total }, { emitEvent: false });
      }
    });

    this.lines.push(line);
  }

  removeLine(index: number) {
    this.lines.removeAt(index);
  }

  get totalAmount(): number {
    return this.lines.value.reduce((sum: number, line: any) => sum + (line.total || 0), 0);
  }

  submitOrder() {
    if (this.poForm.invalid) return;
    this.isSubmitting = true;

    const formValue = this.poForm.value;
    const poData = {
      supplier_id: this.supplierId,
      order_number: formValue.order_number,
      status: formValue.status,
      currency: formValue.currency,
      expected_delivery_date: formValue.expected_delivery_date || null,
      notes: formValue.notes,
      total_amount: this.totalAmount
    };

    this.suppliersService.createPurchaseOrder(poData, formValue.lines).subscribe({
      next: () => {
        alert('تم إنشاء أمر الشراء بنجاح');
        this.showForm = false;
        this.poForm.reset();
        this.lines.clear();
        this.loadOrders();
        this.isSubmitting = false;
      },
      error: () => {
        alert('حدث خطأ');
        this.isSubmitting = false;
      }
    });
  }
}
