// src/app/features/customers/components/customer-list/customer-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CustomersService } from '../../customers.service';
import { Customer } from '../../../../core/models/base.model';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.scss']
})
export class CustomerListComponent implements OnInit {
  private customersService = inject(CustomersService);
  private router = inject(Router);

  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  loading = false;
  searchQuery = '';
  selectedCountry = '';
  selectedType = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;

  // View mode
  viewMode: 'grid' | 'list' = 'grid';

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customersService.getCustomersWithRelations().subscribe({
      next: (data) => {
        this.customers = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.customers];

    // Search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)
      );
    }

    // Filter by country
    if (this.selectedCountry) {
      filtered = filtered.filter(c => c.country?.name === this.selectedCountry);
    }

    // Filter by type
    if (this.selectedType) {
      filtered = filtered.filter(c => c.customer_type?.name === this.selectedType);
    }

    this.filteredCustomers = filtered;
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  getPaginatedCustomers(): Customer[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredCustomers.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  viewCustomer(id: string): void {
    this.router.navigate(['/customers', id]);
  }

  editCustomer(id: string): void {
    this.router.navigate(['/customers', id, 'edit']);
  }

  deleteCustomer(customer: Customer): void {
    if (confirm(`هل أنت متأكد من حذف العميل: ${customer.name}؟`)) {
      this.customersService.delete(customer.id).subscribe({
        next: () => {
          this.loadCustomers();
        },
        error: (error) => {
          console.error('Error deleting customer:', error);
          alert('حدث خطأ أثناء حذف العميل');
        }
      });
    }
  }

  getUniqueCountries(): string[] {
    return [...new Set(this.customers.map(c => c.country?.name).filter(Boolean) as string[])];
  }

  getUniqueTypes(): string[] {
    return [...new Set(this.customers.map(c => c.customer_type?.name).filter(Boolean) as string[])];
  }
}
