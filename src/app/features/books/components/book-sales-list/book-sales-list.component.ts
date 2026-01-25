import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. استيراد ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { BookSale, BookSalesService } from '../../book-sales.service';
import { ExcelExportService } from '../../../../shared/services/excel-export.service';

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
  private cd = inject(ChangeDetectorRef); // 2. حقن خدمة رصد التغييرات

  sales: BookSale[] = [];
  filteredSales: BookSale[] = [];
  loading = false;
  searchQuery = '';

  // فلاتر التاريخ
  startDate: string = '';
  endDate: string = '';
  selectedCurrency: string = 'all';
  selectedPaymentMethod: string = 'all';

  // إحصائيات
  totalSalesUSD = 0;
  totalSalesSYP = 0;
  totalBooksSold = 0;

  ngOnInit() {
    this.setDefaultDates();
    this.loadSales();
  }

  setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  loadSales() {
    this.loading = true;
    this.salesService.getSalesWithDetails().subscribe({
      next: (data) => {
        this.sales = data;
        this.applyFilters();
        this.loading = false;

        // 3. ✅ إجبار الواجهة على التحديث بعد وصول البيانات
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges(); // تحديث الواجهة لإخفاء الـ spinner في حال الخطأ أيضاً
      }
    });
  }

  applyFilters() {
    let filtered = [...this.sales];

    // فلتر النص
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.book?.title?.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q)
      );
    }

    // فلتر التاريخ
    if (this.startDate) {
      const start = new Date(this.startDate);
      filtered = filtered.filter(s => new Date(s.sale_date) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.sale_date) <= end);
    }

    // فلتر العملة
    if (this.selectedCurrency !== 'all') {
      filtered = filtered.filter(s => s.currency === this.selectedCurrency);
    }

    // فلتر طريقة الدفع
    if (this.selectedPaymentMethod !== 'all') {
      filtered = filtered.filter(s => s.payment_method === this.selectedPaymentMethod);
    }

    this.filteredSales = filtered;
    this.calculateStats();
  }

  calculateStats() {
    this.totalSalesUSD = this.filteredSales.reduce((sum, s) => sum + (s.total_usd || 0), 0);
    this.totalSalesSYP = this.filteredSales.reduce((sum, s) => sum + (s.total_syp || 0), 0);
    this.totalBooksSold = this.filteredSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCurrency = 'all';
    this.selectedPaymentMethod = 'all';
    this.setDefaultDates();
    this.applyFilters();
  }

  deleteSale(id: string) {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      this.salesService.deleteSale(id).subscribe({
        next: () => {
          alert('تم الحذف بنجاح');
          this.sales = this.sales.filter(s => s.id !== id); // حذف محلي لتجنب طلب السيرفر مرة أخرى
          this.applyFilters();
          this.cd.detectChanges(); // تحديث الواجهة بعد الحذف
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  exportToExcel() {
    if (this.filteredSales.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const exportData = this.filteredSales.map(sale => ({
      'التاريخ': new Date(sale.sale_date).toLocaleDateString('ar-SA'),
      'الكتاب': sale.book?.title || '-',
      'المؤلف': sale.book?.author || '-',
      'العميل': sale.customer?.name || sale.customer_name || 'عميل نقدي',
      'الكمية': this.toEnglishNumbers(sale.quantity),
      'العملة': sale.currency,
      'سعر الوحدة': this.toEnglishNumbers(
        sale.currency === 'USD'
          ? (sale.unit_price_usd || 0).toFixed(2)
          : (sale.unit_price_syp || 0).toLocaleString('en-US')
      ),
      'الإجمالي': this.toEnglishNumbers(
        sale.currency === 'USD'
          ? (sale.total_usd || 0).toFixed(2)
          : (sale.total_syp || 0).toLocaleString('en-US')
      ),
      'طريقة الدفع': this.getPaymentLabel(sale.payment_method),
      'ملاحظات': sale.notes || '-'
    }));

    exportData.push({
      'التاريخ': 'الإجمالي',
      'الكتاب': '',
      'المؤلف': '',
      'العميل': '',
      'الكمية': this.toEnglishNumbers(this.totalBooksSold),
      'العملة': '',
      'سعر الوحدة': '',
      'الإجمالي': `USD: ${this.toEnglishNumbers(this.totalSalesUSD.toFixed(2))} / SYP: ${this.toEnglishNumbers(this.totalSalesSYP.toLocaleString('en-US'))}`,
      'طريقة الدفع': '',
      'ملاحظات': ''
    } as any);

    this.excelService.exportToExcel(
      exportData,
      'تقرير_المبيعات',
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
