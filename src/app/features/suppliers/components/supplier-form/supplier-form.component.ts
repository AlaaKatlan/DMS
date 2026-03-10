import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';
import { Country } from '../../../../core/models/base.model';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss']
})
export class SupplierFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  countries: Country[] = [];
  isSubmitting = false;
  isEditMode = false;
  supplierId: string | null = null;
  loading = false;

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    service_type: ['printing', Validators.required],
    country_id: [null],
    phone: [''],
    tax_id: [''],
    lead_time_days: [0],
    default_currency: ['USD'],
    notes: [''],
    contacts: this.fb.array([])
  });

  ngOnInit() {
    this.suppliersService.getCountries().subscribe(data => this.countries = data);

    // Check for edit mode
    this.supplierId = this.route.snapshot.paramMap.get('id');
    if (this.supplierId) {
      this.isEditMode = true;
      this.loadSupplier(this.supplierId);
    }
  }

  loadSupplier(id: string): void {
    this.loading = true;
    this.suppliersService.getSupplierDetail(id).subscribe({
      next: (supplier) => {
        if (supplier) {
          this.form.patchValue({
            name: supplier.name,
            service_type: (supplier as any).type || '',
            country_id: supplier.country_id,
            phone: supplier.phone,
            tax_id: supplier.tax_id,
            lead_time_days: supplier.lead_time_days,
            default_currency: supplier.default_currency,
            notes: supplier.notes
          });

          // Load contacts
          const contacts = (supplier as any).contacts || [];
          this.contacts.clear();
          for (const contact of contacts) {
            this.contacts.push(this.fb.group({
              name: [contact.name, Validators.required],
              role: [contact.role || ''],
              email: [contact.email || ''],
              phone: [contact.phone || '']
            }));
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading supplier:', err);
        alert('خطأ في تحميل بيانات المورد');
        this.loading = false;
        this.router.navigate(['/suppliers']);
      }
    });
  }

  get contacts() { return this.form.get('contacts') as FormArray; }

  addContact() {
    this.contacts.push(this.fb.group({
      name: ['', Validators.required],
      role: [''],
      email: [''],
      phone: ['']
    }));
  }

  removeContact(index: number) { this.contacts.removeAt(index); }

  async onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;

    const formValue = this.form.value;
    const supplierData = {
      name: formValue.name,
      type: formValue.service_type,
      country_id: formValue.country_id,
      phone: formValue.phone,
      tax_id: formValue.tax_id,
      lead_time_days: formValue.lead_time_days,
      default_currency: formValue.default_currency,
      notes: formValue.notes
    };

    const operation$ = this.isEditMode && this.supplierId
      ? this.suppliersService.updateSupplierWithDetails(this.supplierId, supplierData, formValue.contacts)
      : this.suppliersService.createSupplierWithDetails(supplierData, formValue.contacts);

    operation$.subscribe({
      next: () => {
        alert(this.isEditMode ? 'تم التحديث بنجاح' : 'تم الحفظ بنجاح');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ');
        this.isSubmitting = false;
      }
    });
  }
}
