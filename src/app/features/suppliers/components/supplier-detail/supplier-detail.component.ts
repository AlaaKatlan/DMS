import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';
import { SupplierExtended } from '../../models/supplier.model';
import { PrintOrdersComponent } from '../print-orders/print-orders.component';
import { SupplierPaymentsComponent } from '../supplier-payments/supplier-payments.component';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, PrintOrdersComponent, SupplierPaymentsComponent],
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss']
})
export class SupplierDetailComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  supplier: SupplierExtended | null = null;
  loading = true;
  activeTab: 'overview' | 'print_orders' | 'payments' = 'overview';
  supplierId: string | null = null;

  ngOnInit(): void {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (this.supplierId) {
      this.loadSupplier(this.supplierId);
    } else {
      this.router.navigate(['/suppliers']);
    }
  }

  loadSupplier(id: string): void {
    this.loading = true;
    this.suppliersService.getSupplierDetail(id).subscribe({
      next: (data: SupplierExtended | null) => {
        if (data) {
          this.supplier = data;
        } else {
          this.router.navigate(['/suppliers']);
        }
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading supplier:', error);
        this.loading = false;
        this.router.navigate(['/suppliers']);
      }
    });
  }

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  deleteSupplier(): void {
    if (!this.supplier) return;
    if (confirm(`هل أنت متأكد من حذف المورد ${this.supplier.name}؟`)) {
      this.suppliersService.delete(this.supplier.id).subscribe({
        next: () => {
          alert('تم الحذف بنجاح');
          this.router.navigate(['/suppliers']);
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/suppliers']);
  }
}
