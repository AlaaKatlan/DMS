// src/app/features/suppliers/components/supplier-list/supplier-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; // أضفنا Router
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';
import { Supplier } from '../../../../core/models/base.model';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private router = inject(Router); // لحقن Router لاستخدامه في التنقل
  private cd = inject(ChangeDetectorRef);

  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  loading = false;
  searchQuery = '';

  // المتغيرات المضافة لحل الأخطاء
  viewMode: 'list' | 'grid' = 'list';
  selectedType: string = 'all';

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.suppliersService.getSuppliersWithRelations().subscribe({
      next: (data: Supplier[]) => {
        this.suppliers = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error: any) => {
        console.error('Error loading suppliers:', error);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.suppliers];

    // فلترة بالبحث
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.phone?.includes(query) ||
        s.type?.toLowerCase().includes(query)
      );
    }

    // فلترة بالنوع
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(s => s.type === this.selectedType);
    }

    this.filteredSuppliers = filtered;
  }

  // --- الدوال الناقصة التي يطلبها الـ HTML ---

  getUniqueTypes(): string[] {
    // استخراج الأنواع الفريدة من خدمات خارجية لملء القائمة المنسدلة
    const types = this.suppliers
      .map(s => s.type)
      .filter((type): type is string => !!type); // إزالة القيم الفارغة
    return [...new Set(types)]; // إزالة التكرار
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
  }

  viewSupplier(id: string): void {
    this.router.navigate(['/suppliers', id]);
  }

  editSupplier(id: string): void {
    this.router.navigate(['/suppliers', id, 'edit']);
  }

  deleteSupplier(supplier: Supplier): void {
    if (confirm(`هل أنت متأكد من حذف المورد: ${supplier.name}؟`)) {
      this.suppliersService.delete(supplier.id).subscribe({
        next: () => this.loadSuppliers(),
        error: (err: any) => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  // دوال مساعدة للعرض
  formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0';
    return `$${amount.toLocaleString()}`;
  }

  getBalance(supplier: Supplier): number {
    const due = supplier.total_due || 0;
    const paid = supplier.total_paid || 0;
    return due - paid;
  }
}
