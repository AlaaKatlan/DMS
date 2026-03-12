// src/app/features/books/components/book-sales-list/book-sales-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BookSalesService } from '../../book-sales.service';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  seller_id?: string;
  seller_name?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  total: number;
  payment_method: 'cash' | 'card' | 'transfer';
  notes?: string;
  sale_date: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  book_id: number;
  quantity: number;
  unit_price_usd: number;
  unit_price_syp: number;
  unit_price_after_discount_syp?: number;
  discount_percentage?: number;
  total_usd: number;
  total_syp: number;
  currency: 'USD' | 'SYP';
  notes?: string;
  book?: any;
}

@Component({
  selector: 'app-book-sales-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './book-sales-list.component.html',
  styleUrls: ['./book-sales-list.component.scss']
})
export class BookSalesListComponent implements OnInit {
  private salesService = inject(BookSalesService);
  private excelService = inject(ExcelExportService);
  private cd = inject(ChangeDetectorRef);

  invoices: SalesInvoice[] = [];
  filteredInvoices: SalesInvoice[] = [];
  loading = false;
  searchQuery = '';

  startDate: string = '';
  endDate: string = '';
  selectedPaymentMethod: string = 'all';

  totalSalesUSD = 0;
  totalSalesSYP = 0;
  totalBooksSold = 0;

  expandedInvoiceId: string | null = null;
  showInvoicePreview = false;
  selectedInvoice: SalesInvoice | null = null;
  errorMessage: string = '';

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.loading = true;
    this.errorMessage = '';

    this.salesService.getSalesInvoicesWithItems().subscribe({
      next: (data) => {
        this.invoices = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.message || 'حدث خطأ أثناء تحميل الفواتير';
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters() {
    let filtered = [...this.invoices];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.seller_name?.toLowerCase().includes(q) ||
        inv.items?.some(item => item.book?.title?.toLowerCase().includes(q))
      );
    }

    if (this.startDate) {
      filtered = filtered.filter(inv => inv.sale_date?.substring(0, 10) >= this.startDate);
    }
    if (this.endDate) {
      filtered = filtered.filter(inv => inv.sale_date?.substring(0, 10) <= this.endDate);
    }
    if (this.selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(inv => inv.payment_method === this.selectedPaymentMethod);
    }

    this.filteredInvoices = filtered;
    this.calculateStats();
  }

  calculateStats() {
    this.totalSalesUSD = 0;
    this.totalSalesSYP = 0;
    this.totalBooksSold = 0;

    this.filteredInvoices.forEach(inv => {
      this.totalSalesSYP += inv.total || 0;
      inv.items?.forEach(item => {
        this.totalSalesUSD += item.total_usd || 0;
        this.totalBooksSold += item.quantity || 0;
      });
    });
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedPaymentMethod = 'all';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  toggleInvoice(invoiceId: string) {
    this.expandedInvoiceId = this.expandedInvoiceId === invoiceId ? null : invoiceId;
  }

  viewInvoice(invoice: SalesInvoice) {
    this.selectedInvoice = invoice;
    this.showInvoicePreview = true;
  }

  printInvoice(invoice: SalesInvoice) {
    this.selectedInvoice = invoice;
    this.showInvoicePreview = true;
    setTimeout(() => this.doPrintInvoice(), 300);
  }

  doPrintInvoice() {
    if (!this.selectedInvoice) return;
    const inv = this.selectedInvoice;

    // ---- حساب الأرقام ----
    const subtotal     = inv.subtotal || 0;
    const discountAmt  = inv.discount_amount || 0;
    const discountPct  = inv.discount_percentage || 0;
    const total        = inv.total || 0;
    const hasDiscount  = discountAmt > 0 || discountPct > 0;

    // مسار اللوغو - تأكد من أن الصورة موجودة في مجلد الأصول assets
    const logoSrc = 'assets/images/logo.png';

    // ---- بناء صفوف الأصناف ----
    const itemsRows = (inv.items || []).map((item, i) => {
      const itemDiscPct  = (item as any).discount_percentage || 0;
      const unitOriginal = item.unit_price_syp || 0;
      const unitAfterDisc = (item as any).unit_price_after_discount_syp
        ?? (itemDiscPct > 0
            ? Math.round(unitOriginal * (1 - itemDiscPct / 100))
            : unitOriginal);
      const rowTotal = item.total_syp || 0;

      return `
        <tr>
          <td>${i + 1}</td>
          <td class="book-col">
            <strong>${item.book?.title || 'كتاب'}</strong>
            ${item.book?.author ? `<br><small>${item.book.author}</small>` : ''}
          </td>
          <td class="center">${item.quantity}</td>
          <td class="num">${unitOriginal.toLocaleString('en-US')}</td>
          ${itemDiscPct > 0
            ? `<td class="center disc-cell">${itemDiscPct}%</td>
               <td class="num disc-cell">${unitAfterDisc.toLocaleString('en-US')}</td>`
            : `<td class="center">—</td><td class="num">—</td>`
          }
          <td class="num total-col">${rowTotal.toLocaleString('en-US')}</td>
        </tr>`;
    }).join('');

    // ---- بناء ملخص الإجمالي (خارج الجدول ليظهر في النهاية فقط) ----
    const summaryBlock = `
      <div class="summary-section">
        <div class="summary-row">
          <span class="label">المجموع قبل الحسم</span>
          <span class="value">${subtotal.toLocaleString('en-US')}</span>
        </div>
        ${hasDiscount ? `
        <div class="summary-row disc-row">
          <span class="label">قيمة الحسم (${discountPct}%)</span>
          <span class="value">− ${discountAmt.toLocaleString('en-US')}</span>
        </div>` : ''}
        <div class="summary-row total-row">
          <span class="label">الإجمالي النهائي</span>
          <span class="value">${total.toLocaleString('en-US')} <small>ل.س</small></span>
        </div>
      </div>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>فاتورة ${inv.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

    :root {
       /* ألوان الهوية البصرية - تم ضبطها لتناسب اللوغو الأخضر */
       --primary-color: #1a6b3c;
       --secondary-color: #2d9e5f;
       --accent-color: #f8fdf9;
       --border-color: #c8ecd8;
       --text-color: #1a1a2e;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Cairo', sans-serif; background: #fff; color: var(--text-color); direction: rtl; -webkit-print-color-adjust: exact; }

    /* Header Styling */
    .inv-header {
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid var(--primary-color);
      margin-bottom: 20px;
    }

    .logo-section { display: flex; align-items: center; gap: 15px; }
    .logo-img { max-height: 80px; width: auto; object-fit: contain; }
    .company-info h1 { font-size: 24px; color: var(--primary-color); font-weight: 900; margin-bottom: 5px; }
    .company-info p { font-size: 12px; color: #666; font-weight: 600; }

    .invoice-meta { text-align: left; }
    .invoice-title { font-size: 18px; font-weight: 700; color: var(--secondary-color); text-transform: uppercase; letter-spacing: 1px; }
    .invoice-number { font-size: 22px; font-weight: 900; color: #000; margin: 5px 0; }
    .invoice-date { font-size: 13px; color: #555; }

    /* Info Cards */
    .info-container { display: flex; gap: 20px; margin: 0 40px 25px; }
    .info-box { flex: 1; background: var(--accent-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; }
    .info-box h3 { font-size: 12px; color: var(--primary-color); margin-bottom: 10px; border-bottom: 1px dashed var(--border-color); padding-bottom: 5px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
    .info-label { color: #666; }
    .info-val { font-weight: 700; }

    /* Table Styling */
    .table-container { margin: 0 40px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }

    thead th {
        background: var(--primary-color);
        color: white;
        padding: 12px;
        text-align: right;
        font-weight: 700;
        border: 1px solid var(--primary-color);
    }

    tbody td { padding: 10px 12px; border: 1px solid #eee; vertical-align: middle; }
    tbody tr:nth-child(even) { background-color: #fcfcfc; }

    .center { text-align: center; }
    .num { text-align: left; font-family: monospace; font-size: 13px; font-weight: 600; }
    .total-col { font-weight: 700; color: var(--primary-color); background: rgba(26, 107, 60, 0.05); }
    .disc-cell { color: #c0392b; }

    /* Summary Section (New Design) */
    .summary-section {
        margin: 20px 40px 0 auto; /* محاذاة لليسار */
        width: 40%;
        background: #f9f9f9;
        border-radius: 8px;
        padding: 15px;
        page-break-inside: avoid; /* يمنع انقسام الصندوق بين صفحتين */
        border: 1px solid #eee;
    }

    .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #ddd; }
    .summary-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .summary-row .label { font-weight: 600; color: #555; }
    .summary-row .value { font-weight: 700; font-family: monospace; font-size: 14px; }

    .summary-row.total-row {
        background: var(--primary-color);
        color: white;
        padding: 12px;
        border-radius: 6px;
        margin-top: 10px;
        border: none;
    }
    .summary-row.total-row .label, .summary-row.total-row .value { color: white; font-size: 16px; font-weight: 900; }
    .summary-row.disc-row .value { color: #c0392b; }

    /* Footer Styling */
    .footer {
        margin-top: 40px;
        padding: 20px 40px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-size: 12px;
        page-break-inside: avoid;
    }
    .notes { width: 60%; color: #555; background: #fffbe6; padding: 12px; border: 1px solid #ffe58f; border-radius: 4px; line-height: 1.5; }
    .signature { width: 30%; text-align: center; margin-top: 10px; }
    .sign-line { border-bottom: 1px solid #ccc; margin-top: 50px; width: 80%; margin-left: auto; margin-right: auto; }

    @media print {
        body { margin: 0; }
        .summary-section { box-shadow: none; border: 1px solid #ccc; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }

        /* إجبار الخلفيات والألوان على الظهور في الطباعة */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="inv-header">
    <div class="logo-section">
      <img src="${logoSrc}" class="logo-img" alt="Logo" onerror="this.style.display='none'">
      <div class="company-info">
        <h1>دار الزيبق</h1>
        <p>للنشر والإنتاج - سوريا، دمشق</p>
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">فاتورة مبيعات</div>
      <div class="invoice-number">#${inv.invoice_number}</div>
      <div class="invoice-date">${new Date(inv.sale_date).toLocaleDateString('en-GB')}</div>
    </div>
  </div>

  <div class="info-container">
    <div class="info-box">
      <h3>معلومات العميل</h3>
      <div class="info-row"><span class="info-label">الاسم:</span> <span class="info-val">${inv.customer_name || 'نقدي'}</span></div>
      ${inv.seller_name ? `<div class="info-row"><span class="info-label">البائع:</span> <span class="info-val">${inv.seller_name}</span></div>` : ''}
    </div>
    <div class="info-box">
       <h3>تفاصيل الفاتورة</h3>
       <div class="info-row"><span class="info-label">طريقة الدفع:</span> <span class="info-val">${this.getPaymentLabel(inv.payment_method)}</span></div>
       <div class="info-row"><span class="info-label">عدد المواد:</span> <span class="info-val">${inv.items?.length || 0}</span></div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>الكتاب</th>
          <th class="center" style="width: 70px;">الكمية</th>
          <th class="num" style="width: 100px;">السعر</th>
          <th class="center" style="width: 70px;">حسم %</th>
          <th class="num" style="width: 100px;">الصافي</th>
          <th class="num" style="width: 120px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>
  </div>

  ${summaryBlock}

  <div class="footer">
    ${inv.notes ? `<div class="notes"><strong>ملاحظات:</strong><br>${inv.notes}</div>` : '<div style="width:60%"></div>'}
    <div class="signature">
      التوقيع / المستلم
      <div class="sign-line"></div>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`);

    printWindow.document.close();
  }

  closeInvoicePreview() {
    this.showInvoicePreview = false;
    this.selectedInvoice = null;
  }

  deleteInvoice(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة وجميع أصنافها؟')) {
      this.salesService.deleteSalesInvoice(id).subscribe({
        next: () => {
          alert('تم الحذف بنجاح');
          this.invoices = this.invoices.filter(inv => inv.id !== id);
          this.applyFilters();
          this.cd.detectChanges();
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  exportToExcel() {
    if (this.filteredInvoices.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const exportData: any[] = [];

    this.filteredInvoices.forEach(invoice => {
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, idx) => {
          exportData.push({
            'رقم الفاتورة': invoice.invoice_number,
            'التاريخ': new Date(invoice.sale_date).toLocaleDateString('en-GB'),
            'العميل': invoice.customer_name || 'عميل نقدي',
            'البائع': invoice.seller_name || '-',
            'الكتاب': item.book?.title || '-',
            'الكمية': item.quantity,
            'سعر الوحدة': item.unit_price_syp,
            'الحسم %': (item as any).discount_percentage || 0,
            'الإجمالي': item.total_syp,
            'طريقة الدفع': idx === 0 ? this.getPaymentLabel(invoice.payment_method) : '',
            'مبلغ الحسم': idx === 0 ? (invoice.discount_amount || 0) : '',
            'إجمالي الفاتورة': idx === 0 ? invoice.total : '',
          });
        });
      } else {
        exportData.push({
          'رقم الفاتورة': invoice.invoice_number,
          'التاريخ': new Date(invoice.sale_date).toLocaleDateString('en-GB'),
          'العميل': invoice.customer_name || 'عميل نقدي',
          'البائع': invoice.seller_name || '-',
          'الكتاب': '-', 'الكمية': '-', 'سعر الوحدة': '-',
          'الحسم %': invoice.discount_percentage || 0,
          'الإجمالي': '-',
          'طريقة الدفع': this.getPaymentLabel(invoice.payment_method),
          'مبلغ الحسم': invoice.discount_amount || 0,
          'إجمالي الفاتورة': invoice.total,
        });
      }
    });

    this.excelService.exportToExcel(exportData, 'تقرير_المبيعات_التفصيلي', 'المبيعات');
  }

  getPaymentLabel(method: string): string {
    const labels: any = { cash: 'نقدي', card: 'بطاقة', transfer: 'تحويل' };
    return labels[method] || method;
  }

  toEnglishNumbers(str: string | number): string {
    if (str === null || str === undefined) return '0';
    const ar = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const en = ['0','1','2','3','4','5','6','7','8','9'];
    let result = str.toString();
    ar.forEach((a, i) => { result = result.replace(new RegExp(a, 'g'), en[i]); });
    return result;
  }
}
