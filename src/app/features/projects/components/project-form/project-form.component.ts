// src/app/features/projects/components/project-form/project-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

// الخدمات
import { ProjectsService } from '../../projects.service';
import { CustomersService } from '../../../customers/customers.service';

// النماذج (Models)
import { Project, Customer, Currency, ProjectStatus } from '../../../../core/models/base.model';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  // حقن الاعتماديات (Dependency Injection)
  private fb = inject(FormBuilder);
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // متغيرات الفورم والحالة
  projectForm!: FormGroup;
  loading = false;
  saving = false;
  isEditMode = false;
  projectId: string | null = null;

  // القوائم المنسدلة
  customers: Customer[] = [];
  currencies: Currency[] = ['USD', 'AED', 'QR', 'SYP', 'OMR'];
  statuses: ProjectStatus[] = ['active', 'completed', 'cancelled', 'on_hold'];
  projectTypes = ['قصة', 'رسم', 'تحريك', 'أغنية', 'كتاب', 'تصميم', 'برمجة', 'تسويق'];

  /**
   * دورة حياة المكون عند البدء
   */
ngOnInit(): void {
    // 1. تهيئة الفورم فوراً لتجنب الأخطاء
    this.initForm();

    // 2. تحميل العملاء لتعبئة القائمة المنسدلة
    this.loadCustomers();

    // 3. التحقق من وضع التعديل
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }
  }
  /**
   * تهيئة هيكلية النموذج (Form Group)
   */
  initForm(): void {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      customer_id: ['', [Validators.required]],
      project_type: [''], // يمكن وضع قيمة افتراضية إذا أردت
      total_price: [0, [Validators.min(0)]],
      currency: ['USD'],
      status: ['active'],
      start_date: [''],
      due_date: [''],
      notes: ['']
    });
  }

  /**
   * جلب قائمة العملاء من السيرفر
   */
  loadCustomers(): void {
    this.customersService.getAll().subscribe({
      next: (data) => {
        this.customers = data;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
      }
    });
  }

  /**
   * التحقق هل نحن في وضع التعديل أم الإضافة
   */
  checkEditMode(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }
  }

  /**
   * تحميل بيانات المشروع وتعبئتها في الفورم (وضع التعديل)
   */
  loadProject(id: string): void {
    this.loading = true;
    this.projectsService.getById(id).subscribe({
      next: (project) => {
        if (project) {
          // استخدام patchValue لتعبئة البيانات الموجودة فقط
          this.projectForm.patchValue({
            title: project.title,
            customer_id: project.customer_id,
            project_type: project.project_type,
            total_price: project.total_price,
            currency: project.currency,
            status: project.status,
            start_date: project.start_date, // تأكد أن التنسيق يطابق input type=date (YYYY-MM-DD)
            due_date: project.due_date,
            notes: project.notes
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading project:', error);
        alert('حدث خطأ أثناء تحميل بيانات المشروع');
        this.router.navigate(['/projects']);
        this.loading = false;
      }
    });
  }

  /**
   * دالة الحفظ (تعمل للإضافة والتعديل معاً)
   */
  async onSubmit(): Promise<void> {
    // 1. التحقق من صحة الفورم
    if (this.projectForm.invalid) {
      this.markFormGroupTouched(this.projectForm);
      return;
    }

    this.saving = true;
    const formData = this.projectForm.value;

    // 2. إرسال البيانات حسب الوضع (تعديل أو إضافة)
    if (this.isEditMode && this.projectId) {
      // --- تحديث (Update) ---
      this.projectsService.update(this.projectId, formData).subscribe({
        next: () => {
          alert('تم تحديث بيانات المشروع بنجاح');
          this.router.navigate(['/projects', this.projectId]); // العودة للتفاصيل
        },
        error: (error) => {
          console.error('Error updating project:', error);
          alert('حدث خطأ أثناء تحديث البيانات');
          this.saving = false;
        }
      });
    } else {
      // --- إنشاء جديد (Create) ---
      this.projectsService.create(formData).subscribe({
        next: (project) => {
          alert('تم إضافة المشروع بنجاح');
          this.router.navigate(['/projects', project.id]); // الذهاب للمشروع الجديد
        },
        error: (error) => {
          console.error('Error creating project:', error);
          alert('حدث خطأ أثناء إضافة المشروع');
          this.saving = false;
        }
      });
    }
  }

  /**
   * زر الإلغاء والعودة
   */
  cancel(): void {
    if (this.isEditMode && this.projectId) {
      this.router.navigate(['/projects', this.projectId]);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  /**
   * تعليم جميع الحقول كلمسها لإظهار أخطاء التحقق (Validation)
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // ==================== Getters & Helpers ====================

  get titleError(): string {
    const title = this.projectForm.get('title');
    if (title?.hasError('required') && title.touched) {
      return 'عنوان المشروع مطلوب';
    }
    if (title?.hasError('minlength') && title.touched) {
      return 'العنوان يجب أن يكون 3 أحرف على الأقل';
    }
    return '';
  }

  get customerError(): string {
    const customer = this.projectForm.get('customer_id');
    if (customer?.hasError('required') && customer.touched) {
      return 'يجب اختيار العميل';
    }
    return '';
  }

  get priceError(): string {
    const price = this.projectForm.get('total_price');
    if (price?.hasError('min') && price.touched) {
      return 'السعر يجب أن يكون صفر أو أكثر';
    }
    return '';
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      'active': 'نشط',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'on_hold': 'متوقف'
    };
    return labels[status] || status;
  }
}
