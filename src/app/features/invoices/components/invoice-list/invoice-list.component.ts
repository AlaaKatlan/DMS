// src/app/features/invoices/components/invoice-list/invoice-list.component.ts
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
  statusFilter = 'all';

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    this.invoicesService.getInvoicesWithRelations().subscribe({
      next: (data) => {
        this.invoices = data;
        this.applyFilter();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilter(): void {
    if (this.statusFilter === 'all') {
      this.filteredInvoices = [...this.invoices];
    } else {
      this.filteredInvoices = this.invoices.filter(inv => inv.status === this.statusFilter);
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
      const labels: any = {
          'paid': 'مدفوعة',
          'unpaid': 'غير مدفوعة',
          'partially_paid': 'دفع جزئي',
          'draft': 'مسودة'
      };
      return labels[status] || status;
  }
}
