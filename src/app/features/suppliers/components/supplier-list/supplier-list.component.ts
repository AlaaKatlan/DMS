// src/app/features/suppliers/components/supplier-list/supplier-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
 import { SuppliersService } from '../../suppliers.service';
import { Supplier } from '../../../../core/models/base.model';

@Component({
  selector: 'app-supplier-list',
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  suppliers: Supplier[] = [];
  filteredSuppliers: Supplier[] = [];
  loading = false;
  searchQuery = '';
  selectedType = '';
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private supplierService: SuppliersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadViewMode();
  }

  loadSuppliers(): void {
    this.loading = true;
    this.supplierService.getSuppliers().subscribe({
      next: (data) => {
        this.suppliers = data;
        this.filteredSuppliers = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.suppliers];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(query) ||
        supplier.phone?.toLowerCase().includes(query) ||
        supplier.country?.name?.toLowerCase().includes(query)
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(supplier => supplier.type === this.selectedType);
    }

    this.filteredSuppliers = filtered;
  }

  getUniqueTypes(): string[] {
    const types = this.suppliers
      .map(s => s.type)
      .filter((type, index, self) => type && self.indexOf(type) === index);
    return types as string[];
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('supplierViewMode', this.viewMode);
  }

  loadViewMode(): void {
    const savedMode = localStorage.getItem('supplierViewMode');
    if (savedMode === 'list' || savedMode === 'grid') {
      this.viewMode = savedMode;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  }

  getBalance(supplier: Supplier): number {
    return (supplier.total_due || 0) - (supplier.total_paid || 0);
  }

  viewSupplier(id: number): void {
    this.router.navigate(['/suppliers', id]);
  }

  editSupplier(id: number): void {
    this.router.navigate(['/suppliers', id, 'edit']);
  }

  deleteSupplier(supplier: Supplier): void {
    if (confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
      this.supplierService.deleteSupplier(supplier.id).subscribe({
        next: () => {
          this.loadSuppliers();
        },
        error: (error) => {
          console.error('Error deleting supplier:', error);
          alert('حدث خطأ أثناء حذف المورد');
        }
      });
    }
  }
}
