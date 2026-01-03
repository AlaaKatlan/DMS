import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';
// ✅ نستخدم النموذج الموسع لدعم الحقول المالية (total_due, total_paid)
import { SupplierExtended } from '../../models/supplier.model';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  // ✅ استخدام SupplierExtended بدلاً من Supplier
  suppliers: SupplierExtended[] = [];
  filteredSuppliers: SupplierExtended[] = [];
  loading = false;
  searchQuery = '';

  viewMode: 'list' | 'grid' = 'list';
  selectedType: string = 'all';

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.suppliersService.getSuppliersWithRelations().subscribe({
      next: (data: SupplierExtended[]) => {
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
        (s.service_type && s.service_type.toString().toLowerCase().includes(query))
      );
    }

    // فلترة بالنوع
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(s => s.service_type === this.selectedType);
    }

    this.filteredSuppliers = filtered;
  }

  getUniqueTypes(): string[] {
    const types = this.suppliers
      .map(s => s.service_type)
      .filter((type): type is string => !!type);
    return [...new Set(types)];
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

  deleteSupplier(supplier: SupplierExtended): void {
    if (confirm(`هل أنت متأكد من حذف المورد: ${supplier.name}؟`)) {
      this.suppliersService.delete(supplier.id).subscribe({
        next: () => this.loadSuppliers(),
        error: (err: any) => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  formatCurrency(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return '$0';
    return `$${amount.toLocaleString()}`;
  }

  getBalance(supplier: SupplierExtended): number {
    const due = supplier.total_due || 0;
    const paid = supplier.total_paid || 0;
    return due - paid;
  }
}
