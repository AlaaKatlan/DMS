import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { InvoicesService } from '../../invoices.service';
import { Invoice } from '../../../../core/models/base.model';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit {
  private invoicesService = inject(InvoicesService);
  private cd = inject(ChangeDetectorRef);

  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  loading = false;

  // فلاتر البحث
  searchQuery = '';
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoicesService.getInvoicesWithRelations().subscribe({
      next: (data) => {
        this.invoices = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.invoices];

    // فلترة بالنص (رقم الفاتورة أو اسم العميل)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.customer?.name?.toLowerCase().includes(query)
      );
    }

    // فلترة بالحالة
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === this.statusFilter);
    }

    this.filteredInvoices = filtered;
  }

  deleteInvoice(id: string): void {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      this.invoicesService.delete(id).subscribe({
        next: () => {
          this.loadInvoices(); // إعادة التحميل لتحديث القائمة
        },
        error: (err) => alert('حدث خطأ أثناء حذف الفاتورة')
      });
    }
  }

  // --- دوال المساعدة للعرض ---

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'paid';
      case 'unpaid': return 'unpaid';
      case 'partially_paid': return 'partially_paid';
      case 'overdue': return 'overdue';
      default: return 'draft';
    }
  }

  getStatusLabel(status: string): string {
      const labels: any = {
          'paid': 'مدفوعة',
          'unpaid': 'غير مدفوعة',
          'partially_paid': 'دفع جزئي',
          'overdue': 'متأخرة',
          'draft': 'مسودة',
          'all': 'الكل'
      };
      return labels[status] || status;
  }
}
