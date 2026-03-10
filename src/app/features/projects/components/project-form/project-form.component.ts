// src/app/features/projects/components/project-form/project-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

// الخدمات
import { ProjectsService } from '../../projects.service';
import { CustomersService } from '../../../customers/customers.service';

// النماذج (Models)
import { Project, Customer, Currency, ProjectStatus, UserProfile } from '../../../../core/models/base.model';
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
  itemsFormArray!: FormArray;
  loading = false;
  saving = false;
  isEditMode = false;
  projectId: string | null = null;

  // القوائم المنسدلة
  customers: Customer[] = [];
  currencies: Currency[] = ['USD', 'AED', 'QR', 'SYP', 'OMR'];
  statuses: ProjectStatus[] = ['active', 'completed', 'cancelled', 'on_hold'];
  freelancers: UserProfile[] = [];
  projectTypes = ['قصة', 'رسم', 'تحريك', 'أغنية', 'كتاب', 'تصميم', 'برمجة', 'تسويق'];

  /**
   * دورة حياة المكون عند البدء
   */
  ngOnInit(): void {
    // 1. تهيئة الفورم فوراً لتجنب الأخطاء
    this.initForm();

    // 2. تحميل العملاء لتعبئة القائمة المنسدلة
    this.loadCustomers();
    this.loadFreelancers();

    // 3. التحقق من وضع التعديل
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }

    // 4. مراقبة تغييرات العناصر والخصم لحساب الإجمالي تلقائياً
    this.itemsFormArray.valueChanges.subscribe(() => {
      this.calculateTotalPrice();
    });
    this.projectForm.get('discount')?.valueChanges.subscribe(() => {
      this.calculateTotalPrice();
    });
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
      discount: [0, [Validators.min(0)]],
      currency: ['USD'],
      status: ['active'],
      start_date: [''],
      due_date: [''],
      notes: [''],
      items: this.fb.array([])
    });

    this.itemsFormArray = this.projectForm.get('items') as FormArray;

    // إضافة عنصر فارغ افتراضي عند الإنشاء الجديد
    if (!this.projectId) {
      this.addItem();
    }
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
   * جلب قائمة المستقلين من السيرفر
   */
  loadFreelancers(): void {
    // نستخدم Supabase للوصول إلى profiles ونجلب أصحاب دور freelancer
    (this.projectsService['supabase'].client as any)
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'freelancer')
      .then(({ data, error }: any) => {
        if (!error && data) {
          this.freelancers = data;
        } else if (error) {
          console.error('Error loading freelancers:', error);
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
    this.projectsService.getProjectDetail(id).subscribe({
      next: (project) => {
        if (project) {
          this.projectForm.patchValue({
            title: project.title,
            customer_id: project.customer_id,
            project_type: project.project_type,
            total_price: project.total_price,
            discount: 0,
            currency: project.currency,
            status: project.status,
            start_date: project.start_date,
            due_date: project.due_date,
            notes: project.notes
          });

          // تعبئة العناصر من المهام إذا كانت موجودة
          if (project.tasks && project.tasks.length > 0) {
            this.itemsFormArray.clear();
            for (const task of project.tasks) {
              this.itemsFormArray.push(this.fb.group({
                id: [task.id],
                title: [task.title, Validators.required],
                quantity: [task.quantity || 1, [Validators.required, Validators.min(1)]],
                unit_price: [task.unit_price || 0, [Validators.required, Validators.min(0)]],
                assignee_id: [task.assignee_id],
                description: [task.description || '']
              }));
            }
          }
        }
        this.loading = false;
        this.calculateTotalPrice(); // Re-calculate after loading items
      },
      error: (error) => {
        console.error('Error loading project:', error);
        alert('حدث خطأ أثناء تحميل بيانات المشروع');
        this.loading = false;
        this.router.navigate(['/projects']);
      }
    });
  }

  /**
   * التعامل مع الفورم أراي (عناصر المشروع)
   */
  createItemFormGroup(): FormGroup {
    return this.fb.group({
      id: [null],
      title: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0)]],
      assignee_id: [null],
      description: ['']
    });
  }

  addItem(): void {
    this.itemsFormArray.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    this.itemsFormArray.removeAt(index);
    this.calculateTotalPrice();
  }

  calculateTotalPrice(): void {
    let total = 0;
    for (const item of this.itemsFormArray.value) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      total += qty * price;
    }
    const discount = parseFloat(this.projectForm.get('discount')?.value) || 0;
    const finalTotal = total - discount;
    this.projectForm.patchValue({ total_price: finalTotal >= 0 ? finalTotal : 0 }, { emitEvent: false });
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
    const formData = { ...this.projectForm.value };
    const items = formData.items;
    delete formData.items; // سنحفظ العناصر بشكل منفصل

    // إضافة الخصم للملاحظات إذا وُجد
    const discount = formData.discount;
    if (discount && discount > 0) {
      const discountNote = `(تم تطبيق خصم بقيمة: ${discount})`;
      formData.notes = formData.notes ? `${formData.notes}\n${discountNote}` : discountNote;
    }
    delete formData.discount;

    // 2. إرسال البيانات حسب الوضع (تعديل أو إضافة)
    if (this.isEditMode && this.projectId) {
      // --- تحديث (Update) ---
      this.projectsService.update(this.projectId, formData).subscribe({
        next: async () => {
          await this.saveProjectItems(this.projectId!, items);
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
        next: async (project) => {
          await this.saveProjectItems(project.id, items);
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
   * حفظ عناصر المشروع (المهام) في جدول project_tasks
   */
  private async saveProjectItems(projectId: string, items: any[]): Promise<void> {
    if (!items || items.length === 0) return;

    const tasks = items.map(item => ({
      id: item.id || undefined,
      project_id: projectId,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      assignee_id: item.assignee_id || null,
      notes: item.notes,
      task_type: 'parallel',
      status: 'todo'
    }));

    await (this.projectsService['supabase'].client as any)
      .from('project_tasks')
      .upsert(tasks, { onConflict: 'id' });
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
