// src/app/features/books/components/book-sales-list/book-sales-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BookSalesService } from '../../book-sales.service';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';

// ✅ واجهة الفاتورة المحسّنة
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

  // فلاتر التاريخ
  startDate: string = '';
  endDate: string = '';
  selectedPaymentMethod: string = 'all';

  // إحصائيات
  totalSalesUSD = 0;
  totalSalesSYP = 0;
  totalBooksSold = 0;

  // ✅ حالة التوسيع
  expandedInvoiceId: string | null = null;

  // ✅ معاينة الفاتورة
  showInvoicePreview = false;
  selectedInvoice: SalesInvoice | null = null;

  ngOnInit() {
    this.setDefaultDates();
    this.loadInvoices();
  }

  setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  // ✅ جلب الفواتير مع الأصناف
  loadInvoices() {
    this.loading = true;
    this.salesService.getSalesInvoicesWithItems().subscribe({
      next: (data) => {
        this.invoices = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters() {
    let filtered = [...this.invoices];

    // فلتر النص
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.seller_name?.toLowerCase().includes(q) ||
        inv.items?.some(item => item.book?.title?.toLowerCase().includes(q))
      );
    }

    // فلتر التاريخ
    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter(inv => new Date(inv.sale_date) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(inv => new Date(inv.sale_date) <= end);
    }

    // فلتر طريقة الدفع
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
    this.setDefaultDates();
    this.applyFilters();
  }

  // ✅ توسيع/إخفاء الفاتورة
  toggleInvoice(invoiceId: string) {
    if (this.expandedInvoiceId === invoiceId) {
      this.expandedInvoiceId = null;
    } else {
      this.expandedInvoiceId = invoiceId;
    }
    // this.showInvoicePreview = true;
  }

  // ✅ عرض الفاتورة
  viewInvoice(invoice: SalesInvoice) {
    this.selectedInvoice = invoice;
    this.showInvoicePreview = true;
  }

  // ✅ طباعة الفاتورة مباشرة
  printInvoice(invoice: SalesInvoice) {
    this.selectedInvoice = invoice;
    this.showInvoicePreview = true;
    // انتظر قليلاً حتى يتم عرض المودال ثم اطبع
    setTimeout(() => {
      this.doPrintInvoice();
    }, 100);
  }

  // ✅ تنفيذ الطباعة
  doPrintInvoice() {
    const printArea = document.getElementById('invoice-print-area');
    if (!printArea) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>فاتورة ${this.selectedInvoice?.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .company-info h2 {
            font-size: 24px;
            margin-bottom: 5px;
          }
          .customer-section {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .customer-section h4 {
            margin-bottom: 10px;
            font-size: 16px;
          }
          .customer-section p {
            margin-bottom: 5px;
          }
          .invoice-items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .invoice-items-table th,
          .invoice-items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
          }
          .invoice-items-table th {
            background: #333;
            color: white;
            font-weight: bold;
          }
          .invoice-items-table tfoot td {
            font-weight: bold;
            background: #f9f9f9;
          }
          .payment-info {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .payment-info p {
            margin-bottom: 8px;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  closeInvoicePreview() {
    this.showInvoicePreview = false;
    this.selectedInvoice = null;
  }

  // ✅ حذف فاتورة
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

  // ✅ تصدير Excel
  exportToExcel() {
    if (this.filteredInvoices.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const exportData: any[] = [];

    this.filteredInvoices.forEach(invoice => {
      invoice.items?.forEach((item, idx) => {
        exportData.push({
          'رقم الفاتورة': invoice.invoice_number,
          'التاريخ': new Date(invoice.sale_date).toLocaleDateString('ar-SA'),
          'العميل': invoice.customer_name || 'عميل نقدي',
          'البائع': invoice.seller_name || '-',
          'الكتاب': item.book?.title || '-',
          'الكمية': this.toEnglishNumbers(item.quantity),
          'سعر الوحدة': this.toEnglishNumbers(item.unit_price_syp.toLocaleString('en-US')),
          'الإجمالي': this.toEnglishNumbers(item.total_syp.toLocaleString('en-US')),
          'طريقة الدفع': idx === 0 ? this.getPaymentLabel(invoice.payment_method) : '',
          'إجمالي الفاتورة': idx === 0 ? this.toEnglishNumbers(invoice.total.toLocaleString('en-US')) : '',
          'ملاحظات': item.notes || '-'
        });
      });
    });

    this.excelService.exportToExcel(
      exportData,
      'تقرير_المبيعات_التفصيلي',
      'المبيعات'
    );
  }

  getPaymentLabel(method: string): string {
    const labels: any = { cash: 'نقدي', card: 'بطاقة', transfer: 'تحويل' };
    return labels[method] || method;
  }

  toEnglishNumbers(str: string | number): string {
    if (str === null || str === undefined) return '0';
    const arabicNumbers = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const englishNumbers = ['0','1','2','3','4','5','6','7','8','9'];
    let result = str.toString();
    arabicNumbers.forEach((arabic, index) => {
      result = result.replace(new RegExp(arabic, 'g'), englishNumbers[index]);
    });
    return result;
  }
}
