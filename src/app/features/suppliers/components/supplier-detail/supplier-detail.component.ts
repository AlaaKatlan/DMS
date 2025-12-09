// src/app/features/suppliers/components/supplier-detail/supplier-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../models/supplier.model';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-supplier-detail',
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss']
})
export class SupplierDetailComponent implements OnInit {
  supplier?: Supplier;
  loading = false;
  activeTab = 'details';

  tabs: Tab[] = [
    { id: 'details', label: 'التفاصيل', icon: 'info' },
    { id: 'orders', label: 'الطلبات', icon: 'package' },
    { id: 'payments', label: 'الدفعات', icon: 'credit-card' },
    { id: 'activity', label: 'السجل', icon: 'activity' }
  ];

  constructor(
    private supplierService: SupplierService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSupplier(+id);
    }
  }

  loadSupplier(id: number): void {
    this.loading = true;
    this.supplierService.getSupplier(id).subscribe({
      next: (data) => {
        this.supplier = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading supplier:', error);
        this.loading = false;
        alert('حدث خطأ أثناء تحميل بيانات المورد');
        this.router.navigate(['/suppliers']);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  }

  getBalance(): number {
    if (!this.supplier) return 0;
    return (this.supplier.total_due || 0) - (this.supplier.total_paid || 0);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  deleteSupplier(): void {
    if (!this.supplier) return;

    if (confirm(`هل أنت متأكد من حذف المورد "${this.supplier.name}"؟\nسيتم حذف جميع البيانات المرتبطة به.`)) {
      this.supplierService.deleteSupplier(this.supplier.id).subscribe({
        next: () => {
          this.router.navigate(['/suppliers']);
        },
        error: (error) => {
          console.error('Error deleting supplier:', error);
          alert('حدث خطأ أثناء حذف المورد');
        }
      });
    }
  }
}
