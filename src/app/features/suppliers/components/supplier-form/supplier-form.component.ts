import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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

  countries: Country[] = [];
  isSubmitting = false;

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
      type: formValue.service_type, // ✅ تصحيح الاسم
      country_id: formValue.country_id,
      phone: formValue.phone,
      tax_id: formValue.tax_id,
      lead_time_days: formValue.lead_time_days,
      default_currency: formValue.default_currency,
      notes: formValue.notes
    };

    this.suppliersService.createSupplierWithDetails(supplierData, formValue.contacts).subscribe({
      next: () => {
        alert('تم الحفظ');
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
