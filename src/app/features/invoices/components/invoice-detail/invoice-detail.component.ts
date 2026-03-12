import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InvoicesService } from '../../invoices.service';
import { Invoice } from '../../../../core/models/base.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  private invoicesService = inject(InvoicesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  invoice: Invoice | null = null;
  loading = true;

  projectInvoices: Invoice[] = [];
  projectInvoicesLoading = false;

  // ==================== Payment Modal ====================
  showPaymentModal = false;
  paymentSubmitting = false;
  paymentMethods: any[] = [];

  paymentForm = {
    amount: 0,
    payment_method_id: '',
    payment_method: '',
    paid_at: new Date().toISOString().split('T')[0],
    notes: '',
    selectedItems: new Set<string>()
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadInvoice(id);
    else this.router.navigate(['/invoices']);
  }

  loadInvoice(id: string): void {
    this.loading = true;
    this.invoicesService.getInvoiceDetail(id).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.invoice = data;
          this.loading = false;
          this.cd.detectChanges();
          if (data?.project_id) this.loadProjectInvoices(data.project_id as string);
        }, 0);
      },
      error: () => { this.loading = false; this.router.navigate(['/invoices']); }
    });
  }

  loadProjectInvoices(projectId: string): void {
    this.projectInvoicesLoading = true;
    this.invoicesService.getInvoicesByProject(projectId).subscribe({
      next: (data) => { this.projectInvoices = data; this.projectInvoicesLoading = false; this.cd.detectChanges(); },
      error: () => { this.projectInvoicesLoading = false; }
    });
  }

  // ==================== Payment Modal ====================

  openPaymentModal(): void {
    if (!this.paymentMethods.length) {
      this.invoicesService.getPaymentMethods().subscribe(d => { this.paymentMethods = d; this.cd.detectChanges(); });
    }
    this.paymentForm = {
      amount: this.remaining,
      payment_method_id: '',
      payment_method: '',
      paid_at: new Date().toISOString().split('T')[0],
      notes: '',
      selectedItems: new Set()
    };
    (this.invoice?.items || []).forEach((item: any) => this.paymentForm.selectedItems.add(item.id));
    this.showPaymentModal = true;
  }

  closePaymentModal(): void { this.showPaymentModal = false; }

  toggleItemInPayment(itemId: string): void {
    if (this.paymentForm.selectedItems.has(itemId)) this.paymentForm.selectedItems.delete(itemId);
    else this.paymentForm.selectedItems.add(itemId);
    this.recalcPaymentAmount();
  }

  isItemSelectedForPayment(itemId: string): boolean { return this.paymentForm.selectedItems.has(itemId); }

  selectAllItems(): void {
    (this.invoice?.items || []).forEach((item: any) => this.paymentForm.selectedItems.add(item.id));
    this.recalcPaymentAmount();
  }

  deselectAllItems(): void { this.paymentForm.selectedItems.clear(); this.paymentForm.amount = 0; }

  get allItemsSelected(): boolean {
    const items = this.invoice?.items || [];
    return items.length > 0 && this.paymentForm.selectedItems.size === items.length;
  }

  recalcPaymentAmount(): void {
    const selected = (this.invoice?.items || []).filter((item: any) => this.paymentForm.selectedItems.has(item.id));
    const total = selected.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    this.paymentForm.amount = Math.min(total, this.remaining);
  }

  get selectedItemsTotal(): number {
    return (this.invoice?.items || [])
      .filter((item: any) => this.paymentForm.selectedItems.has(item.id))
      .reduce((sum: number, item: any) => sum + (item.total || 0), 0);
  }

  onPaymentMethodChange(): void {
    const method = this.paymentMethods.find(m => m.id === this.paymentForm.payment_method_id);
    this.paymentForm.payment_method = method?.name || '';
  }

  async submitPayment(): Promise<void> {
    if (!this.invoice) return;
    if (!this.paymentForm.amount || this.paymentForm.amount <= 0) { alert('أدخل مبلغاً صحيحاً'); return; }
    if (!this.paymentForm.payment_method_id) { alert('اختر طريقة الدفع'); return; }

    this.paymentSubmitting = true;
    try {
      const supabase = (this.invoicesService as any).supabase.client;
      const { error: payErr } = await supabase.from('invoice_payments').insert({
        invoice_id: this.invoice.id,
        amount: this.paymentForm.amount,
        payment_method: this.paymentForm.payment_method,
        payment_method_id: this.paymentForm.payment_method_id,
        paid_at: this.paymentForm.paid_at,
        notes: this.paymentForm.notes || null
      });
      if (payErr) throw payErr;

      const newPaid = this.totalPaid + this.paymentForm.amount;
      const amountDue = this.invoice.amount_due || 0;
      const newStatus = newPaid >= amountDue ? 'paid' : 'partially_paid';
      await supabase.from('invoices').update({ status: newStatus }).eq('id', this.invoice.id);

      this.showPaymentModal = false;
      if (this.invoice?.id) this.loadInvoice(this.invoice.id);
    } catch (err: any) {
      alert('فشل تسجيل الدفعة: ' + (err.message || err));
    } finally {
      this.paymentSubmitting = false;
    }
  }

  // ==================== حسابات ====================

  get totalPaid(): number {
    if (!this.invoice?.payments?.length) return this.invoice?.status === 'paid' ? (this.invoice.amount_due || 0) : 0;
    return this.invoice.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  get remaining(): number {
    if (this.invoice?.status === 'paid') return 0;
    return Math.max(0, (this.invoice?.amount_due || 0) - this.totalPaid);
  }

  get projectTotalInvoiced(): number { return this.projectInvoices.reduce((s, i) => s + (i.amount_due || 0), 0); }

  get projectTotalPaid(): number {
    return this.projectInvoices.reduce((sum, inv) => {
      if (!inv.payments?.length) return sum + (inv.status === 'paid' ? (inv.amount_due || 0) : 0);
      return sum + inv.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    }, 0);
  }

  get projectTotalPrice(): number { return this.invoice?.project?.total_price || 0; }
  get projectRemaining(): number { return Math.max(0, this.projectTotalPrice - this.projectTotalPaid); }
  get hasProject(): boolean { return !!this.invoice?.project_id; }

  // ==================== طباعة ====================

  printInvoice(): void { this.openPrintWindow(false); }
  printWithProjectDetails(): void { this.openPrintWindow(true); }

  private openPrintWindow(withProject: boolean): void {
    const inv = this.invoice;
    if (!inv) return;

    const currency = inv.currency || 'USD';
    const fmt = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// الإصلاح هنا: السماح بـ undefined بالإضافة إلى null
    const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
    const statusMap: any = { paid: { label: 'مدفوعة', color: '#166534', bg: '#DCFCE7' }, unpaid: { label: 'غير مدفوعة', color: '#991B1B', bg: '#FEE2E2' }, partially_paid: { label: 'مدفوعة جزئياً', color: '#92400E', bg: '#FEF3C7' }, overdue: { label: 'متأخرة', color: '#991B1B', bg: '#FEE2E2' } };
    const st = statusMap[inv.status] || { label: inv.status, color: '#374151', bg: '#f3f4f6' };

    // ─── بنود الفاتورة ───
    const itemsRows = (inv.items || []).map((item: any, i: number) => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 16px;text-align:center;color:#9ca3af;font-weight:700;">${i + 1}</td>
        <td style="padding:12px 16px;font-weight:600;color:#1f2937;">${item.description || ''}</td>
        <td style="padding:12px 16px;text-align:center;color:#6b7280;">${item.quantity}</td>
        <td style="padding:12px 16px;text-align:center;color:#6b7280;">${fmt(item.unit_price || 0)}</td>
        <td style="padding:12px 16px;text-align:center;font-weight:800;color:#059669;font-size:15px;">${fmt(item.total || 0)}</td>
      </tr>`).join('');

    // ─── سجل الدفعات ───
    const paymentsRows = (inv.payments?.length) ? (inv.payments || []).map((p: any) => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 14px;font-size:13px;color:#374151;">${fmtDate(p.paid_at)}</td>
        <td style="padding:10px 14px;font-size:13px;color:#374151;">${p.payment_method || '-'}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#059669;">${fmt(p.amount || 0)} ${currency}</td>
        <td style="padding:10px 14px;font-size:13px;color:#9ca3af;">${p.notes || '-'}</td>
      </tr>`).join('') : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#9ca3af;font-style:italic;">لا توجد دفعات مسجلة</td></tr>`;

    // ─── ملخص المشروع (فقط عند withProject) ───
    let projectSection = '';
    if (withProject && this.hasProject) {
      // جدول فواتير المشروع
      const projInvRows = this.projectInvoices.map(pinv => {
        const paid = this.getInvoicePaid(pinv);
        const rem = this.getInvoiceRemaining(pinv);
        const isCurrent = pinv.id === inv.id;
        const pSt = statusMap[pinv.status] || { label: pinv.status, color: '#374151', bg: '#f3f4f6' };
        return `
          <tr style="border-bottom:1px solid #f0f0f0;${isCurrent ? 'background:#f0fdf4;' : ''}">
            <td style="padding:10px 14px;font-size:13px;font-weight:600;">
              ${isCurrent ? '<span style="background:#059669;color:white;font-size:10px;padding:2px 7px;border-radius:99px;margin-left:6px;">الحالية</span>' : ''}
              ${pinv.invoice_number}
            </td>
            <td style="padding:10px 14px;font-size:13px;color:#6b7280;">${fmtDate(pinv.issue_date)}</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:600;text-align:center;">${fmt(pinv.amount_due || 0)}</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#059669;text-align:center;">${fmt(paid)}</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:${rem > 0 ? '#dc2626' : '#059669'};text-align:center;">${fmt(rem)}</td>
            <td style="padding:10px 14px;text-align:center;">
              <span style="background:${pSt.bg};color:${pSt.color};padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;">${pSt.label}</span>
            </td>
          </tr>`;
      }).join('');

      const projInvTable = this.projectInvoices.length > 0 ? `
        <div style="margin-top:20px;">
          <h4 style="font-size:13px;font-weight:700;color:#374151;margin:0 0 10px;">جميع فواتير المشروع</h4>
          <div style="border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:linear-gradient(135deg,#4CAF50,#66BB6A);">
                  <th style="padding:10px 14px;text-align:right;color:white;font-size:12px;">رقم الفاتورة</th>
                  <th style="padding:10px 14px;text-align:right;color:white;font-size:12px;">التاريخ</th>
                  <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;">المبلغ</th>
                  <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;">المدفوع</th>
                  <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;">المتبقي</th>
                  <th style="padding:10px 14px;text-align:center;color:white;font-size:12px;">الحالة</th>
                </tr>
              </thead>
              <tbody>${projInvRows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb;font-weight:700;border-top:2px solid #e5e7eb;">
                  <td colspan="2" style="padding:10px 14px;font-size:13px;">الإجمالي</td>
                  <td style="padding:10px 14px;font-size:13px;text-align:center;">${fmt(this.projectTotalInvoiced)}</td>
                  <td style="padding:10px 14px;font-size:13px;text-align:center;color:#059669;">${fmt(this.projectTotalPaid)}</td>
                  <td style="padding:10px 14px;font-size:13px;text-align:center;color:${this.projectRemaining > 0 ? '#dc2626' : '#059669'};">${fmt(this.projectRemaining)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>` : '';

      projectSection = `
        <div style="margin-top:30px;background:#f9fafb;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:16px 20px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border-bottom:1px solid #d1fae5;display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">📁</span>
            <h3 style="margin:0;font-size:15px;font-weight:700;color:#065f46;">ملخص المشروع: ${inv.project?.title || ''}</h3>
          </div>
          <div style="padding:20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px;">
              <div style="background:white;padding:14px;border-radius:10px;border:1px solid #e5e7eb;text-align:center;">
                <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:8px;text-transform:uppercase;">قيمة المشروع الكاملة</div>
                <div style="font-size:18px;font-weight:800;color:#1f2937;">${fmt(this.projectTotalPrice)} <span style="font-size:12px;font-weight:500;">${currency}</span></div>
              </div>
              <div style="background:white;padding:14px;border-radius:10px;border:1px solid #d1fae5;text-align:center;">
                <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:8px;text-transform:uppercase;">إجمالي المدفوع</div>
                <div style="font-size:18px;font-weight:800;color:#059669;">${fmt(this.projectTotalPaid)} <span style="font-size:12px;font-weight:500;">${currency}</span></div>
              </div>
              <div style="background:white;padding:14px;border-radius:10px;border:1px solid ${this.projectRemaining > 0 ? '#fecaca' : '#d1fae5'};text-align:center;">
                <div style="font-size:11px;color:#9ca3af;font-weight:600;margin-bottom:8px;text-transform:uppercase;">المتبقي على المشروع</div>
                <div style="font-size:18px;font-weight:800;color:${this.projectRemaining > 0 ? '#dc2626' : '#059669'};">${fmt(this.projectRemaining)} <span style="font-size:12px;font-weight:500;">${currency}</span></div>
              </div>
            </div>
            ${projInvTable}
          </div>
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>فاتورة ${inv.invoice_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #1a202c; background: white; padding: 32px; font-size: 14px; line-height: 1.6; }
  @media print { body { padding: 16px; } @page { margin: 0.8cm; size: A4; } }
</style>
</head>
<body>

<!-- الهيدر -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:28px;border-bottom:3px solid;border-image:linear-gradient(90deg,#4CAF50,#66BB6A,transparent) 1;">
  <div style="display:flex;gap:16px;align-items:flex-start;">
    <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="20" fill="url(#g1)"/>
      <path d="M30 50L45 65L70 35" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4CAF50"/><stop offset="100%" stop-color="#2E7D32"/>
      </linearGradient></defs>
    </svg>
    <div>
      <div style="font-size:26px;font-weight:800;color:#2E7D32;margin-bottom:3px;">دار الزيبق</div>
      <div style="color:#6b7280;font-size:13px;margin-bottom:10px;">للنشر والتوزيع والخدمات الطباعية</div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <span style="color:#9ca3af;font-size:12px;">📍 دمشق - سوريا</span>
        <span style="color:#9ca3af;font-size:12px;">📞 0112233445</span>
        <span style="color:#9ca3af;font-size:12px;">✉️ info@alzaybaq.com</span>
      </div>
    </div>
  </div>
  <div style="text-align:left;padding:18px 22px;background:linear-gradient(135deg,rgba(76,175,80,0.06),rgba(102,187,106,0.04));border-radius:14px;border:2px solid rgba(76,175,80,0.2);">
    <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">فاتورة مبيعات</div>
    <div style="font-size:22px;font-weight:800;font-family:monospace;margin-bottom:14px;color:#1f2937;">#${inv.invoice_number}</div>
    <span style="padding:5px 14px;border-radius:99px;font-size:12px;font-weight:700;background:${st.bg};color:${st.color};">${st.label}</span>
  </div>
</div>

<!-- معلومات العميل + التواريخ -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;">
  <div style="background:#f9fafb;padding:16px;border-radius:14px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;">
      <span style="color:#4CAF50;font-size:16px;">👤</span>
      <span style="font-size:13px;font-weight:700;color:#1f2937;">معلومات العميل</span>
    </div>
    <div style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:8px;">${inv.customer?.name || 'عميل نقدي'}</div>
    ${inv.customer?.phone ? `<div style="color:#6b7280;font-size:13px;margin-bottom:4px;">📞 ${inv.customer.phone}</div>` : ''}
    ${inv.customer?.email ? `<div style="color:#6b7280;font-size:13px;">✉️ ${inv.customer.email}</div>` : ''}
  </div>
  <div style="background:#f9fafb;padding:16px;border-radius:14px;border:1px solid #e5e7eb;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #e5e7eb;">
      <span style="color:#4CAF50;font-size:16px;">📅</span>
      <span style="font-size:13px;font-weight:700;color:#1f2937;">التواريخ والمشروع</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <span style="color:#9ca3af;font-size:12px;font-weight:600;">تاريخ الإصدار:</span>
      <span style="font-weight:700;font-size:13px;">${fmtDate(inv.issue_date)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
      <span style="color:#9ca3af;font-size:12px;font-weight:600;">تاريخ الاستحقاق:</span>
      <span style="font-weight:700;font-size:13px;">${fmtDate(inv.due_date)}</span>
    </div>
    ${inv.project ? `<div style="display:flex;justify-content:space-between;">
      <span style="color:#9ca3af;font-size:12px;font-weight:600;">المشروع:</span>
      <span style="font-weight:700;font-size:13px;color:#4CAF50;">📁 ${inv.project.title}</span>
    </div>` : ''}
  </div>
</div>

<!-- بنود الفاتورة -->
<div style="margin-bottom:28px;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
    <span style="color:#4CAF50;font-size:16px;">🛒</span>
    <span style="font-size:14px;font-weight:700;color:#1f2937;">بنود الفاتورة</span>
  </div>
  <div style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:linear-gradient(135deg,#4CAF50,#66BB6A);">
          <th style="padding:12px 16px;text-align:center;color:white;font-size:12px;width:5%;">#</th>
          <th style="padding:12px 16px;text-align:right;color:white;font-size:12px;width:45%;">البيان</th>
          <th style="padding:12px 16px;text-align:center;color:white;font-size:12px;width:15%;">الكمية</th>
          <th style="padding:12px 16px;text-align:center;color:white;font-size:12px;width:15%;">السعر</th>
          <th style="padding:12px 16px;text-align:center;color:white;font-size:12px;width:20%;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>
  </div>
</div>

<!-- الملخص المالي -->
<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;margin-bottom:30px;">
  <!-- سجل الدفعات -->
  <div style="background:#f9fafb;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;">
      <span style="color:#4CAF50;">💳</span>
      <span style="font-size:13px;font-weight:700;color:#1f2937;">سجل الدفعات</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 14px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">التاريخ</th>
          <th style="padding:8px 14px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">طريقة الدفع</th>
          <th style="padding:8px 14px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">المبلغ</th>
          <th style="padding:8px 14px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">ملاحظات</th>
        </tr>
      </thead>
      <tbody>${paymentsRows}</tbody>
    </table>
  </div>

  <!-- الأرقام -->
  <div style="background:white;border-radius:14px;border:2px solid #e5e7eb;padding:20px;display:flex;flex-direction:column;justify-content:space-between;">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#6b7280;font-weight:600;font-size:13px;">المجموع الجزئي:</span>
        <span style="font-weight:800;font-size:14px;">${fmt(inv.amount_due || 0)} ${currency}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
        <span style="color:#6b7280;font-weight:600;font-size:13px;">المدفوع:</span>
        <span style="font-weight:800;font-size:14px;color:#059669;">${fmt(this.totalPaid)} ${currency}</span>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#4CAF50,#66BB6A);border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
      <span style="color:white;font-weight:700;font-size:14px;">المتبقي:</span>
      <span style="color:white;font-weight:800;font-size:20px;">${fmt(this.remaining)} ${currency}</span>
    </div>
  </div>
</div>

${projectSection}

<!-- التوقيعات -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-top:40px;padding-top:24px;border-top:2px solid #e5e7eb;">
  ${['المحاسب', 'المدير العام', 'المستلم'].map(s => `
    <div style="text-align:center;">
      <div style="height:52px;border-bottom:2px solid #e5e7eb;margin-bottom:10px;"></div>
      <span style="color:#9ca3af;font-size:12px;font-weight:600;">${s}</span>
    </div>`).join('')}
</div>

<!-- الفوتر -->
<div style="text-align:center;margin-top:32px;padding-top:20px;border-top:3px solid;border-image:linear-gradient(90deg,transparent,#4CAF50,#66BB6A,transparent) 1;">
  <p style="color:#6b7280;font-size:13px;font-weight:600;">شكراً لتعاملكم مع دار الزيبق • نسعد بخدمتكم دائماً</p>
</div>

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=900');
    win?.document.write(html);
    win?.document.close();
  }

  // ==================== Helpers ====================

  getStatusLabel(status: string): string {
    const map: any = { paid: 'مدفوعة', unpaid: 'غير مدفوعة', partially_paid: 'جزئية', overdue: 'متأخرة' };
    return map[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: any = { paid: 'check-circle', unpaid: 'x-circle', partially_paid: 'alert-circle', overdue: 'clock' };
    return icons[status] || 'file-text';
  }

  getStatusClass(status: string): string { return status; }
  downloadInvoice(): void { this.printInvoice(); }

  getInvoicePaid(inv: Invoice): number {
    if (!inv.payments?.length) return inv.status === 'paid' ? (inv.amount_due || 0) : 0;
    return inv.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  }

  getInvoiceRemaining(inv: Invoice): number {
    if (inv.status === 'paid') return 0;
    return Math.max(0, (inv.amount_due || 0) - this.getInvoicePaid(inv));
  }
}
