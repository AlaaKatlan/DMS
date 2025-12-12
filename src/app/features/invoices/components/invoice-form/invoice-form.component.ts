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

  customers: any[] = [];
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  paymentMethods: any[] = []; // قائمة طرق الدفع

  ngOnInit(): void {
    this.initForm();
    this.loadData();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.invoiceId = id;
        this.loadInvoice(id);
      } else {
        this.addItem();
      }
    });

    // فلترة المشاريع
    this.invoiceForm.get('customer_id')?.valueChanges.subscribe(cid => this.filterProjects(cid));
  }

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
      // حقول الدفع
      initial_payment_amount: [0],
      payment_method_id: [null],
      items: this.fb.array([])
    });

    // مراقبة الحالة لإظهار حقول الدفع
    this.invoiceForm.get('status')?.valueChanges.subscribe(status => {
      const payMethod = this.invoiceForm.get('payment_method_id');
      const payAmount = this.invoiceForm.get('initial_payment_amount');

      if (status === 'paid' || status === 'partially_paid') {
        payMethod?.setValidators(Validators.required);
        if (status === 'paid') payAmount?.setValue(this.grandTotal);
      } else {
        payMethod?.clearValidators();
        payAmount?.setValue(0);
      }
      payMethod?.updateValueAndValidity();
    });
  }

  get items(): FormArray { return this.invoiceForm.get('items') as FormArray; }

  addItem(item?: any): void {
    const group = this.fb.group({
      description: [item?.description || '', Validators.required],
      quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
      unit_price: [item?.unit_price || 0, [Validators.required, Validators.min(0)]],
      total: [item?.total || 0]
    });

    group.valueChanges.subscribe(val => {
      const t = (val.quantity || 0) * (val.unit_price || 0);
      if (val.total !== t) group.patchValue({ total: t }, { emitEvent: false });
    });
    this.items.push(group);
  }

  removeItem(i: number) { this.items.removeAt(i); }

  get grandTotal(): number {
    return this.items.controls.reduce((acc, c) => acc + (c.get('total')?.value || 0), 0);
  }

  loadData(): void {
    this.customersService.getCustomersLite().subscribe(d => this.customers = d);
    this.projectsService.getProjectsWithRelations().subscribe(d => this.projects = d);
    // جلب طرق الدفع
    this.invoicesService.getPaymentMethods().subscribe(d => this.paymentMethods = d);
  }

  filterProjects(cid: string): void {
    if (!cid) { this.filteredProjects = []; return; }
    this.filteredProjects = this.projects.filter(p => p.customer_id === cid);
  }

  loadInvoice(id: string): void {
    this.loading = true;
    this.invoicesService.getInvoiceDetail(id).subscribe({
      next: (inv) => {
        if (inv) {
          this.invoiceForm.patchValue(inv);
          this.items.clear();
          if (inv.items?.length) inv.items.forEach(i => this.addItem(i));
          else this.addItem();
        }
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => { this.loading = false; this.router.navigate(['/invoices']); }
    });
  }

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }
    if (this.items.length === 0) { alert('أضف بنداً واحداً على الأقل'); return; }

    this.submitting = true;
    const formVal = this.invoiceForm.getRawValue();

    // تجهيز الدفعة
    let initialPayment = undefined;
    if (formVal.initial_payment_amount > 0 && formVal.payment_method_id) {
      initialPayment = {
        amount: formVal.initial_payment_amount,
        method_id: formVal.payment_method_id,
        notes: 'دفعة أولية'
      };
    }

    const { items, initial_payment_amount, payment_method_id, ...mainData } = formVal;
    mainData.amount_due = this.grandTotal;

    if (this.isEditMode) {
      this.invoicesService.update(this.invoiceId!, mainData).subscribe({
        next: () => { alert('تم التحديث'); this.router.navigate(['/invoices']); },
        error: () => { this.submitting = false; alert('فشل التحديث'); }
      });
    } else {
      this.invoicesService.createInvoiceWithItems(mainData, items, initialPayment)
        .then(() => { alert('تم الحفظ'); this.router.navigate(['/invoices']); })
        .catch(err => { this.submitting = false; alert('فشل الحفظ: ' + err.message); });
    }
  }
}
