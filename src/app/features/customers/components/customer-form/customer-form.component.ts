// src/app/features/customers/components/customer-form/customer-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CustomersService } from '../../customers.service';
import { Customer, Country, CustomerType } from '../../../../core/models/base.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customersService = inject(CustomersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  customerForm!: FormGroup;
  loading = false;
  saving = false;
  isEditMode = false;
  customerId: string | null = null;

  countries: Country[] = [];
  customerTypes: CustomerType[] = [];

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.loadCustomerTypes();
    this.checkEditMode();
  }

  initForm(): void {
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.required]],
      address: [''],
      country_id: [''],
      customer_type_id: [''],
      notes: ['']
    });
  }

  loadCountries(): void {
    this.customersService.getCountries().subscribe({
      next: (data) => {
        this.countries = data;
      },
      error: (error) => {
        console.error('Error loading countries:', error);
      }
    });
  }

  loadCustomerTypes(): void {
    this.customersService.getCustomerTypes().subscribe({
      next: (data) => {
        this.customerTypes = data;
      },
      error: (error) => {
        console.error('Error loading customer types:', error);
      }
    });
  }

  checkEditMode(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    if (this.customerId) {
      this.isEditMode = true;
      this.loadCustomer(this.customerId);
    }
  }

  loadCustomer(id: string): void {
    this.loading = true;
    this.customersService.getById(id).subscribe({
      next: (customer) => {
        if (customer) {
          this.customerForm.patchValue({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            country_id: customer.country_id,
            customer_type_id: customer.customer_type_id,
            notes: customer.notes
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customer:', error);
        alert('حدث خطأ أثناء تحميل بيانات العميل');
        this.router.navigate(['/customers']);
        this.loading = false;
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      return;
    }

    // Email uniqueness check
    if (this.customerForm.value.email) {
      const emailExists = await this.customersService.isEmailExists(
        this.customerForm.value.email,
        this.customerId || undefined
      );
      if (emailExists) {
        alert('البريد الإلكتروني مستخدم بالفعل');
        return;
      }
    }

    this.saving = true;

    const formData = this.customerForm.value;

    if (this.isEditMode && this.customerId) {
      this.customersService.update(this.customerId, formData).subscribe({
        next: () => {
          alert('تم تحديث بيانات العميل بنجاح');
          this.router.navigate(['/customers', this.customerId]);
        },
        error: (error) => {
          console.error('Error updating customer:', error);
          alert('حدث خطأ أثناء تحديث البيانات');
          this.saving = false;
        }
      });
    } else {
      this.customersService.create(formData).subscribe({
        next: (customer) => {
          alert('تم إضافة العميل بنجاح');
          this.router.navigate(['/customers', customer.id]);
        },
        error: (error) => {
          console.error('Error creating customer:', error);
          alert('حدث خطأ أثناء إضافة العميل');
          this.saving = false;
        }
      });
    }
  }

  cancel(): void {
    if (this.isEditMode && this.customerId) {
      this.router.navigate(['/customers', this.customerId]);
    } else {
      this.router.navigate(['/customers']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Getters للتحقق من الأخطاء
  get nameError(): string {
    const name = this.customerForm.get('name');
    if (name?.hasError('required') && name.touched) {
      return 'الاسم مطلوب';
    }
    if (name?.hasError('minlength') && name.touched) {
      return 'الاسم يجب أن يكون 3 أحرف على الأقل';
    }
    return '';
  }

  get emailError(): string {
    const email = this.customerForm.get('email');
    if (email?.hasError('email') && email.touched) {
      return 'البريد الإلكتروني غير صحيح';
    }
    return '';
  }

  get phoneError(): string {
    const phone = this.customerForm.get('phone');
    if (phone?.hasError('required') && phone.touched) {
      return 'رقم الهاتف مطلوب';
    }
    return '';
  }
}
