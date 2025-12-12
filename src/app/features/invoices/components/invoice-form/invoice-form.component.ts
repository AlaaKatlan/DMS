import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InvoicesService } from '../../invoices.service';
import { CustomersService } from '../../../customers/customers.service';
import { ProjectsService } from '../../../projects/projects.service';
import { Project } from '../../../../core/models/base.model';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent implements OnInit {
  // ... (نفس الحقن السابق)
  private fb = inject(FormBuilder);
  private invoicesService = inject(InvoicesService);
  private customersService = inject(CustomersService);
  private projectsService = inject(ProjectsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cd = inject(ChangeDetectorRef);

  invoiceForm!: FormGroup;
  isEditMode = false;
  invoiceId: string | null = null;
  loading = false;
  submitting = false;

  // تغيير نوع العملاء ليناسب الدالة الخفيفة
  customers: {id: string, name: string}[] = [];
  projects: Project[] = [];
  filteredProjects: Project[] = [];

  ngOnInit(): void {
    this.initForm();
    this.loadData(); // سيتم استخدام الدالة السريعة هنا

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.invoiceId = id;
        this.loadInvoice(id);
      } else {
        this.addItem(); // إضافة سطر افتراضي

        // تعيين العملة الافتراضية بوضوح
        this.invoiceForm.patchValue({ currency: 'USD', status: 'unpaid' });
      }
    });

    // فلترة المشاريع عند تغيير العميل
    this.invoiceForm.get('customer_id')?.valueChanges.subscribe(customerId => {
      this.filterProjects(customerId);
    });
  }

  // ... (initForm و addItem و removeItem و grandTotal كما هي)
  initForm(): void {
    this.invoiceForm = this.fb.group({
      invoice_number: [''],
      customer_id: [null, Validators.required],
      project_id: [null],
      issue_date: [new Date().toISOString().split('T')[0], Validators.required],
      due_date: [null, Validators.required],
      status: ['unpaid', Validators.required],
      currency: ['USD', Validators.required],
      notes: [''],
      items: this.fb.array([])
    });
  }

  get items(): FormArray { return this.invoiceForm.get('items') as FormArray; }

  addItem(item?: any): void {
    const itemGroup = this.fb.group({
      description: [item?.description || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unit_price: [item?.unit_price || 0, [Validators.required, Validators.min(0)]],
      total: [item?.total || 0]
    });

    itemGroup.valueChanges.subscribe(val => {
      const total = (val.quantity || 0) * (val.unit_price || 0);
      if (val.total !== total) {
        itemGroup.patchValue({ total: total }, { emitEvent: false });
      }
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number): void { this.items.removeAt(index); }

  get grandTotal(): number {
    return this.items.controls.reduce((acc, c) => acc + (c.get('total')?.value || 0), 0);
  }

  loadData(): void {
    // 1. استخدام الدالة السريعة (Lite)
    this.customersService.getCustomersLite().subscribe({
      next: (data: any[]) => {
        this.customers = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Error loading customers', err)
    });

    // 2. تحميل المشاريع (يمكن تحسينها لاحقاً لجلب مشاريع العميل المختار فقط)
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (data) => this.projects = data,
      error: (err) => console.error('Error loading projects', err)
    });
  }

  filterProjects(customerId: string): void {
    if (!customerId) {
      this.filteredProjects = [];
      this.invoiceForm.patchValue({ project_id: null });
      return;
    }
    this.filteredProjects = this.projects.filter(p => p.customer_id === customerId);
  }

  loadInvoice(id: string): void {
    // ... (نفس الكود السابق)
    this.loading = true;
    this.invoicesService.getInvoiceDetail(id).subscribe({
      next: (invoice) => {
        if (invoice) {
          this.invoiceForm.patchValue({
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id,
            project_id: invoice.project_id,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            status: invoice.status,
            currency: invoice.currency,
            notes: invoice.notes
          });
          this.items.clear();
          if (invoice.items?.length) invoice.items.forEach(i => this.addItem(i));
          else this.addItem();
        }
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => { this.loading = false; this.router.navigate(['/invoices']); }
    });
  }

  onSubmit(): void {
    // 1. كشف الأخطاء: إذا كان النموذج غير صالح، نعلم جميع الحقول
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched(); // سيُظهر الحقول الحمراء

      // طباعة سبب الخطأ في الكونسول للمطور
      console.log('Form errors:', this.invoiceForm.errors);
      this.items.controls.forEach((c, i) => console.log(`Item ${i} errors:`, c.errors));

      alert('يرجى تعبئة جميع الحقول المطلوبة (العميل، التاريخ، ووصف البنود)');
      return;
    }

    if (this.items.length === 0) {
      alert('يجب إضافة بند واحد على الأقل');
      return;
    }

    this.submitting = true;

    const formValue = this.invoiceForm.getRawValue();
    const invoiceData = { ...formValue, amount_due: this.grandTotal };
    const { items, ...mainData } = invoiceData;

    if (this.isEditMode) {
      this.invoicesService.update(this.invoiceId!, mainData).subscribe({
        next: () => {
          alert('تم التحديث بنجاح');
          this.router.navigate(['/invoices']);
        },
        error: (err) => {
          console.error(err);
          this.submitting = false;
          alert('فشل التحديث');
        }
      });
    } else {
      this.invoicesService.createInvoiceWithItems(mainData, items)
        .then(() => {
          alert('تم إنشاء الفاتورة بنجاح');
          this.router.navigate(['/invoices']);
        })
        .catch(err => {
          console.error('Create Error:', err);
          this.submitting = false;
          alert('فشل إنشاء الفاتورة: ' + (err.message || 'خطأ غير معروف'));
        });
    }
  }
}
