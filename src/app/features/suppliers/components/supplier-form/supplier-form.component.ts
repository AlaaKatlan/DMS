import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SuppliersService } from '../../suppliers.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss']
})
export class SupplierFormComponent {
  private fb = inject(FormBuilder);
  private suppliersService = inject(SuppliersService);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    service_type: ['printing', Validators.required],
    country: ['', Validators.required],
    tax_id: [''],
    lead_time_days: [0],
    default_currency: ['USD'],
    contacts: this.fb.array([])
  });

  isSubmitting = false;

  get contacts() {
    return this.form.get('contacts') as FormArray;
  }

  addContact() {
    const contactForm = this.fb.group({
      name: ['', Validators.required],
      role: [''],
      email: ['', [Validators.email]],
      phone: [''],
      is_primary: [false]
    });
    this.contacts.push(contactForm);
  }

  removeContact(index: number) {
    this.contacts.removeAt(index);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;

    const formValue = this.form.value;
    const supplierData = { ...formValue };
    delete supplierData.contacts;

    // التحقق من التكرار
    const isDuplicate = await this.suppliersService.checkDuplicate(supplierData.name, supplierData.tax_id).toPromise();
    if (isDuplicate) {
      if (!confirm('يوجد مورد بنفس الاسم. هل تود المتابعة؟')) {
        this.isSubmitting = false;
        return;
      }
    }

    this.suppliersService.createSupplierWithDetails(supplierData, formValue.contacts).subscribe({
      next: () => {
        alert('تم إضافة المورد بنجاح');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
        this.isSubmitting = false;
      }
    });
  }
}
