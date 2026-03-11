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
  freelancers: UserProfile[] = [];
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
    this.cd.detectChanges();

    this.projectsService.getProjectDetail(id).subscribe({
      next: (project) => {
        if (project) {
          this.projectForm.patchValue({
            title: project.title,
            customer_id: project.customer_id,
            project_type: project.project_type || '',
            total_price: project.total_price || 0,
            discount: 0,
            currency: project.currency || 'USD',
            status: project.status || 'active',
            start_date: project.start_date || '',
            due_date: project.due_date || '',
            notes: project.notes || ''
          });

          if (project.tasks && project.tasks.length > 0) {
            this.itemsFormArray.clear();
            for (const task of project.tasks) {
              this.itemsFormArray.push(this.fb.group({
                id: [task.id],
                title: [task.title, Validators.required],
                quantity: [task.quantity || 1, [Validators.required, Validators.min(1)]],
                unit_price: [task.unit_price || 0, [Validators.min(0)]],
                assignee_id: [task.assignee_id || null],
                description: [task.description || '']
              }));
            }
            this.calculateTotalPrice();
          }
        }
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading project:', error);
        alert('حدث خطأ أثناء تحميل بيانات المشروع');
        this.loading = false;
        this.cd.detectChanges();
        this.router.navigate(['/projects']);
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
    const formData = { ...this.projectForm.value };
    const items = formData.items;
    delete formData.items;

    // Add discount info to notes if any
    const discount = formData.discount;
    if (discount && discount > 0) {
      const discountNote = `(خصم: ${discount} ${formData.currency})`;
      formData.notes = formData.notes ? `${formData.notes}\n${discountNote}` : discountNote;
    }
    delete formData.discount;

    // ✅ FIX: Remove updated_at — not a valid column in projects table trigger
    delete formData.updated_at;

    if (this.isEditMode && this.projectId) {
      // ✅ استخدام updateProject() التي تتجاوز supabase.service وتمنع إرسال updated_at
      this.projectsService.updateProject(this.projectId, formData).subscribe({
        next: async () => {
          await this.saveProjectItems(this.projectId!, items);
          alert('تم تحديث بيانات المشروع بنجاح');
          this.saving = false;
          this.router.navigate(['/projects', this.projectId]);
        },
        error: (error) => {
          console.error('Error updating project:', error);
          alert('حدث خطأ: ' + (error.message || JSON.stringify(error)));
          this.saving = false;
        }
      });

    } else {
      this.projectsService.create(formData).subscribe({
        next: async (project) => {
          await this.saveProjectItems(project.id, items);
          alert('تم إضافة المشروع بنجاح');
          this.router.navigate(['/projects', project.id]);
        },
        error: (error) => {
          console.error('Error creating project:', error);
          alert('حدث خطأ: ' + (error.message || JSON.stringify(error)));
          this.saving = false;
        }
      });
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
}
