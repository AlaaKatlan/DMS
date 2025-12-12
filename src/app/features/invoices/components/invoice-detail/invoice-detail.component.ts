import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InvoicesService } from '../../invoices.service';
import { Invoice } from '../../../../core/models/base.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  private invoicesService = inject(InvoicesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  invoice: Invoice | null = null;
  loading = true;
  invoiceId: string | null = null;

  ngOnInit(): void {
    this.invoiceId = this.route.snapshot.paramMap.get('id');
    if (this.invoiceId) {
      this.loadInvoice(this.invoiceId);
    } else {
      this.router.navigate(['/invoices']);
    }
  }
loadInvoice(id: string): void {
    this.loading = true;
    this.invoicesService.getInvoiceDetail(id).subscribe({
      next: (data) => {
        // الـ setTimeout ضروري جداً هنا لتأخير التحديث للدورة التالية
        setTimeout(() => {
          this.invoice = data;
          this.loading = false;
          this.cd.detectChanges(); // إجبار التحديث
        }, 0);
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges(); // تحديث لإخفاء السبينر
      }
    });
  }
  deleteInvoice(): void {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة نهائياً؟')) {
      this.invoicesService.delete(this.invoiceId!).subscribe({
        next: () => {
          alert('تم حذف الفاتورة بنجاح');
          this.router.navigate(['/invoices']);
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  printInvoice(): void {
    window.print();
  }

  // --- Helpers ---

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'paid': 'مدفوعة بالكامل',
      'unpaid': 'غير مدفوعة',
      'partially_paid': 'مدفوعة جزئياً',
      'overdue': 'متأخرة',
      'draft': 'مسودة',
      'cancelled': 'ملغاة'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'paid': 'bg-green-100 text-green-700 border-green-200',
      'unpaid': 'bg-red-100 text-red-700 border-red-200',
      'partially_paid': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'overdue': 'bg-red-50 text-red-600 font-bold border-red-200',
      'cancelled': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return classes[status] || 'bg-gray-50 text-gray-600';
  }

  formatCurrency(amount: number | undefined, currency: string = 'USD'): string {
    return `${(amount || 0).toLocaleString()} ${currency}`;
  }

  calculateTotalPaid(): number {
    if (!this.invoice?.payments) return 0;
    return this.invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  calculateRemaining(): number {
    return (this.invoice?.amount_due || 0) - this.calculateTotalPaid();
  }
}
