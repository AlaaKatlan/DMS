// src/app/features/customers/components/customer-detail/customer-detail.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. استيراد ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CustomersService } from '../../customers.service';
import { Customer, CustomerStats } from '../../../../core/models/base.model';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit {
  private customersService = inject(CustomersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef); // 2. حقن الخدمة

  customer: Customer | null = null;
  stats: CustomerStats | null = null;
  loading = true;
  activeTab: 'info' | 'projects' | 'invoices' | 'payments' = 'info';

  customerId: string | null = null;

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.loadCustomer(this.customerId);
      this.loadStats(this.customerId);
    } else {
      this.router.navigate(['/customers']);
    }
  }

  loadCustomer(id: string): void {
    this.loading = true;
    this.customersService.getCustomerDetail(id).subscribe({
      next: (data) => {
        this.customer = data;
        this.loading = false;
        this.cd.detectChanges(); // 3. تحديث الواجهة يدوياً هنا
      },
      error: (error) => {
        console.error('Error loading customer:', error);
        alert('حدث خطأ أثناء تحميل بيانات العميل');
        this.router.navigate(['/customers']);
        this.loading = false;
        this.cd.detectChanges(); // وتحديث الواجهة هنا أيضاً
      }
    });
  }

  loadStats(id: string): void {
    this.customersService.getCustomerStats(id).subscribe({
      next: (data) => {
        this.stats = data;
        this.cd.detectChanges(); // تحديث الأرقام عند وصولها
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    // لا نحتاج detectChanges هنا لأن النقر حدث داخل Angular Zone
  }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['/customers', this.customerId, 'edit']);
    }
  }

  deleteCustomer(): void {
    if (!this.customer) return;

    if (confirm(`هل أنت متأكد من حذف العميل: ${this.customer.name}؟`)) {
      this.customersService.delete(this.customer.id).subscribe({
        next: () => {
          alert('تم حذف العميل بنجاح');
          this.router.navigate(['/customers']);
        },
        error: (error) => {
          console.error('Error deleting customer:', error);
          alert('حدث خطأ أثناء حذف العميل');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }


formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  // حماية ضد القيم الفارغة: إذا لم يوجد رقم نعتبره 0
  const safeAmount = amount ?? 0;

  const symbols: Record<string, string> = {
    USD: '$',
    AED: 'د.إ',
    QR: 'ر.ق',
    SYP: 'ل.س'
  };

  return `${symbols[currency] || ''} ${safeAmount.toLocaleString('ar-SA')}`;
}

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ar-SA');
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'active': 'success',
      'completed': 'info',
      'cancelled': 'danger',
      'paid': 'success',
      'unpaid': 'warning',
      'partially_paid': 'info'
    };
    return colors[status] || 'default';
  }
}
