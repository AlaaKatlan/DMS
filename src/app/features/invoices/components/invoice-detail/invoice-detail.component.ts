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
  paymentMethods: any[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
      this.loadPaymentMethods();
    } else {
      this.router.navigate(['/invoices']);
    }
  }

  loadInvoice(id: string): void {
    this.loading = true;
    this.invoicesService.getInvoiceDetail(id).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.invoice = data;
          this.loading = false;
          this.cd.detectChanges();
        }, 0);
      },
      error: () => { this.loading = false; this.router.navigate(['/invoices']); }
    });
  }

  loadPaymentMethods(): void {
    this.invoicesService.getPaymentMethods().subscribe(data => this.paymentMethods = data);
  }

  printInvoice(): void { window.print(); }

  // --- الحسابات الدقيقة ---
  get totalPaid(): number {
    return this.invoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  }

  get remaining(): number {
    const rem = (this.invoice?.amount_due || 0) - this.totalPaid;
    return rem > 0 ? rem : 0;
  }

  // --- Helpers ---
  getStatusLabel(status: string): string {
    const map: any = { 'paid': 'مدفوعة', 'unpaid': 'غير مدفوعة', 'partially_paid': 'جزئية', 'overdue': 'متأخرة' };
    return map[status] || status;
  }

  getStatusIcon(status: string): string {
  const icons: any = {
    'paid': 'check-circle',
    'unpaid': 'x-circle',
    'partially_paid': 'alert-circle',
    'overdue': 'clock'
  };
  return icons[status] || 'file-text';
}

getStatusClass(status: string): string {
  return status; // سيتم استخدامه مع ngClass في HTML
}

downloadInvoice(): void {
  // يمكنك إضافة منطق تحميل PDF هنا
  window.print();
}
}
