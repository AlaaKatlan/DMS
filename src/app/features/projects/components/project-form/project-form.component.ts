// src/app/features/projects/components/project-form/project-form.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ProjectsService } from '../../projects.service';
import { CustomersService } from '../../../customers/customers.service';
import { Project, Customer, Currency, ProjectStatus, UserProfile } from '../../../../core/models/base.model';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectsService = inject(ProjectsService);
  private customersService = inject(CustomersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);

  projectForm!: FormGroup;
  itemsFormArray!: FormArray;
  loading = false;
  saving = false;
  isEditMode = false;
  projectId: string | null = null;

  customers: Customer[] = [];
  currencies: Currency[] = ['USD', 'AED', 'QR', 'SYP', 'OMR'];
  statuses: ProjectStatus[] = ['active', 'completed', 'cancelled', 'on_hold'];
  freelancers: any[] = [];
  projectTypes = ['قصة', 'رسم', 'تحريك', 'أغنية', 'كتاب', 'تصميم', 'برمجة', 'تسويق'];

  // ✅ expose Math for template
  Math = Math;

  ngOnInit(): void {
    this.initForm();
    this.loadCustomers();
    this.loadFreelancers();

    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.isEditMode = true;
      this.loadProject(this.projectId);
    }

    // Watch for changes to recalculate total
    this.itemsFormArray.valueChanges.subscribe(() => this.calculateTotalPrice());
    this.projectForm.get('discount')?.valueChanges.subscribe(() => this.calculateTotalPrice());
  }

  initForm(): void {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      customer_id: ['', [Validators.required]],
      project_type: [''],
      total_price: [{ value: 0, disabled: false }],
      discount: [0],
      currency: ['USD'],
      status: ['active'],
      start_date: [''],
      due_date: [''],
      notes: [''],
      items: this.fb.array([])
    });

    this.itemsFormArray = this.projectForm.get('items') as FormArray;

    if (!this.projectId) {
      this.addItem();
    }
  }

  loadCustomers(): void {
    this.customersService.getAll().subscribe({
      next: (data) => { this.customers = data; this.cd.detectChanges(); },
      error: (err) => console.error('Error loading customers:', err)
    });
  }

  loadFreelancers(): void {
    this.projectsService.getFreelancers().subscribe({
      next: (data) => {
        this.freelancers = data;
        console.log('Freelancers loaded:', data.length, data);
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading freelancers:', err);
        this.freelancers = [];
      }
    });
  }

 loadProject(id: string): void {
    this.loading = true;
    this.projectsService.getProjectDetail(id).subscribe({
      next: (project) => {
        // ✅ إضافة شرط للتأكد من أن المشروع ليس null
        if (!project) {
          this.loading = false;
          alert('لم يتم العثور على المشروع');
          this.router.navigate(['/projects']);
          return;
        }

        // 1. تعبئة المعلومات الأساسية للمشروع
        this.projectForm.patchValue({
          title: project.title,
          customer_id: project.customer_id,
          project_type: project.project_type,
          total_price: project.total_price,
          currency: project.currency,
          start_date: project.start_date,
          due_date: project.due_date,
          notes: project.notes,
          status: project.status
        });

        // 2. تفريغ المصفوفة أولاً لتجنب التكرار
        this.itemsFormArray.clear();

        // 3. تعبئة العناصر (المهام) القديمة داخل الفورم لكي تظهر للمستخدم
        if (project.tasks && project.tasks.length > 0) {
          // داخل الـ if (project.tasks && project.tasks.length > 0)
project.tasks.forEach(task => {
  this.itemsFormArray.push(this.fb.group({
    id: [task.id],
    title: [task.title, Validators.required],
    quantity: [task.quantity || 1, [Validators.required, Validators.min(1)]],
    unit_price: [task.unit_price || 0, [Validators.required, Validators.min(0)]],
    // ✅ هنا الدمج: نأخذ الموجود منهما لكي يظهر الاسم الصحيح في القائمة المنسدلة
    assignee_id: [task.assignee_id || task.supplier_id || ''],
    description: [task.description || '']
  }));
});
        } else {
          // إذا لم يكن هناك عناصر سابقة، أضف صفاً فارغاً افتراضياً
          this.addItem();
        }

        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        // معالجة الخطأ...
      }
    });
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      id: [null],
      title: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.min(0)]],
      assignee_id: [null],
      description: ['']
    });
  }

  addItem(): void {
    this.itemsFormArray.push(this.createItemFormGroup());
    // Scroll to bottom after adding
    setTimeout(() => {
      const el = document.querySelector('.add-item-bottom');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  removeItem(index: number): void {
    this.itemsFormArray.removeAt(index);
    this.calculateTotalPrice();
  }

  // ✅ Helper methods for +/- buttons (avoid inline Math in template issues)
  incrementQty(itemForm: AbstractControl): void {
    const current = itemForm.get('quantity')?.value || 0;
    itemForm.get('quantity')?.setValue(current + 1);
  }

  decrementQty(itemForm: AbstractControl): void {
    const current = itemForm.get('quantity')?.value || 1;
    if (current > 1) {
      itemForm.get('quantity')?.setValue(current - 1);
    }
  }

  calculateTotalPrice(): void {
    let subtotal = 0;
    for (const item of this.itemsFormArray.value) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      subtotal += qty * price;
    }
    const discount = parseFloat(this.projectForm.get('discount')?.value) || 0;
    const finalTotal = Math.max(0, subtotal - discount);
    this.projectForm.patchValue({ total_price: finalTotal }, { emitEvent: false });
  }

  async onSubmit(): Promise<void> {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched(this.projectForm);
      return;
    }

    this.saving = true;
    const formData = { ...this.projectForm.getRawValue() };

    // ✅ معالجة العناصر بذكاء للفصل بين المورد والموظف
    const items = (formData.items || []).map((item: any) => {
      // نبحث هل الـ ID المختار يعود لمورد؟
      const isSupplier = this.freelancers.some(f => f.id === item.assignee_id && f.source === 'supplier');

      return {
        ...item,
        // إذا كان مورداً، نضع الـ ID في حقل المورد ونفرغ حقل الموظف والعكس صحيح
        supplier_id: isSupplier ? item.assignee_id : null,
        assignee_id: isSupplier ? null : (item.assignee_id || null)
      };
    });
    delete formData.items;

    const discount = formData.discount;
    if (discount && discount > 0) {
      const discountNote = `(خصم: ${discount} ${formData.currency})`;
      formData.notes = formData.notes ? `${formData.notes}\n${discountNote}` : discountNote;
    }
    delete formData.discount;
    delete formData.updated_at;

    try {
      if (this.isEditMode && this.projectId) {
        this.projectsService.updateProject(this.projectId, formData).subscribe({
          next: async () => {
            try {
              await this.saveProjectItems(this.projectId!, items);
              alert('تم تحديث بيانات المشروع بنجاح');
              this.router.navigate(['/projects', this.projectId]);
            } catch (itemErr: any) {
              alert('تم التحديث لكن فشل حفظ العناصر: \n' + (itemErr.message || JSON.stringify(itemErr)));
            } finally {
              this.saving = false;
            }
          },
          error: (error) => {
            console.error('Error updating project:', error);
            alert('حدث خطأ: ' + (error.message || ''));
            this.saving = false;
          }
        });
      } else {
        this.projectsService.create(formData).subscribe({
          next: async (project: any) => {
            try {
              const newProjectId = Array.isArray(project) ? project[0].id : project.id;
              await this.saveProjectItems(newProjectId, items);
              alert('تم إضافة المشروع بنجاح');
              this.router.navigate(['/projects', newProjectId]);
            } catch (itemErr: any) {
              alert('تم إنشاء المشروع لكن فشل حفظ العناصر: \n' + (itemErr.message || JSON.stringify(itemErr)));
            } finally {
              this.saving = false;
            }
          },
          error: (error) => {
            console.error('Error creating project:', error);
            alert('حدث خطأ: ' + (error.message || ''));
            this.saving = false;
          }
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      this.saving = false;
    }
  }
  // ✅ delegate to service — supabase access is clean there
  async saveProjectItems(projectId: string, items: any[]): Promise<void> {
    await this.projectsService.saveProjectItems(projectId, items);
  }

  cancel(): void {
    if (this.isEditMode && this.projectId) {
      this.router.navigate(['/projects', this.projectId]);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  // ==================== Getters ====================

  get titleError(): string {
    const c = this.projectForm.get('title');
    if (c?.hasError('required') && c.touched) return 'عنوان المشروع مطلوب';
    if (c?.hasError('minlength') && c.touched) return 'العنوان يجب أن يكون 3 أحرف على الأقل';
    return '';
  }

  get customerError(): string {
    const c = this.projectForm.get('customer_id');
    if (c?.hasError('required') && c.touched) return 'يجب اختيار العميل';
    return '';
  }

  get priceError(): string {
    const c = this.projectForm.get('total_price');
    if (c?.hasError('min') && c.touched) return 'السعر يجب أن يكون صفر أو أكثر';
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
  getEmployees(): any[] {
    return this.freelancers.filter(f => f.source === 'employee');
  }

  getFreelancersList(): any[] {
    return this.freelancers.filter(f => f.source === 'supplier');
  }
}
