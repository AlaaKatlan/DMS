import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuppliersService } from '../../suppliers.service';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-supplier-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './supplier-payments.component.html',
  styleUrls: ['./supplier-payments.component.scss']
})
export class SupplierPaymentsComponent implements OnInit {
  @Input() supplierId!: string;
  private suppliersService = inject(SuppliersService);

  payments: any[] = [];
  showModal = false;

  newPayment = {
    amount: 0,
    currency: 'USD',
    payment_method: 'bank_transfer',
    transfer_ref: '',
    paid_at: new Date().toISOString().split('T')[0],
    notes: ''
  };

  ngOnInit() {
    if(this.supplierId) this.loadPayments();
  }

  loadPayments() {
    this.suppliersService.getSupplierPayments(this.supplierId).subscribe(data => {
      this.payments = data;
    });
  }

  savePayment() {
    const paymentData = { ...this.newPayment, supplier_id: this.supplierId };

    this.suppliersService.addSupplierPayment(paymentData).subscribe({
      next: () => {
        alert('تم تسجيل الدفعة');
        this.showModal = false;
        this.loadPayments();
        this.newPayment.amount = 0;
        this.newPayment.transfer_ref = '';
      },
      error: () => alert('خطأ في التسجيل')
    });
  }
}
