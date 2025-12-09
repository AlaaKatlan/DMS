// src/app/features/suppliers/components/supplier-detail/supplier-detail.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';
import { Supplier } from '../../../../core/models/base.model';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './supplier-detail.component.html',
  styleUrls: ['./supplier-detail.component.scss']
})
export class SupplierDetailComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  supplier: Supplier | null = null;
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
      // 👇 الإصلاح هنا: قبول Supplier | null
      next: (data: Supplier | null) => {
        if (data) {
          this.supplier = data;
        } else {
          // في حال لم يتم العثور على المورد
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
        error: (error: any) => {
          console.error('Error deleting supplier:', error);
          alert('حدث خطأ أثناء الحذف');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/suppliers']);
  }
}
