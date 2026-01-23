import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // أضفت ActivatedRoute لدعم التعديل مستقبلاً
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
    country_id: [null, Validators.required],
    tax_id: [''],
    lead_time_days: [0],
    default_currency: ['USD'],
    phone: [''], // تمت إضافته لأنه موجود في الجدول الأساسي
    notes: [''],
    contacts: this.fb.array([])
  });

  ngOnInit() {
    this.loadLookups();
  }

  loadLookups() {
    this.suppliersService.getCountries().subscribe({
      next: (data) => this.countries = data,
      error: (err) => console.error('Error loading countries', err)
    });
  }

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;

    const formValue = this.form.value;

    // ✅ تجهيز البيانات لتطابق أسماء أعمدة قاعدة البيانات
    const supplierData = {
      name: formValue.name,
      type: formValue.service_type, // 👈 تحويل service_type إلى type
      country_id: formValue.country_id,
      tax_id: formValue.tax_id,
      lead_time_days: formValue.lead_time_days,
      default_currency: formValue.default_currency,
      phone: formValue.phone,
      notes: formValue.notes
    };

    // التحقق من التكرار
    const isDuplicate = await this.suppliersService.checkDuplicate(supplierData.name, supplierData.tax_id).toPromise();
    if (isDuplicate) {
      if (!confirm('يوجد مورد بنفس الاسم. هل تود المتابعة؟')) {
        this.isSubmitting = false;
        return;
      }
    }

    // إرسال البيانات
    this.suppliersService.createSupplierWithDetails(supplierData, formValue.contacts).subscribe({
      next: () => {
        alert('تم إضافة المورد بنجاح');
        this.router.navigate(['/suppliers']);
      },
      error: (err) => {
        console.error('Save Error:', err);
        const msg = err.error?.message || err.message || 'خطأ غير معروف';
        alert(`حدث خطأ أثناء الحفظ: ${msg}`);
        this.isSubmitting = false;
      }
    });
  }
}
