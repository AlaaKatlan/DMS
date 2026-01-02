import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AccountingService } from '../../accounting.service';
import { LedgerEntry, AccountBalance } from '../../../../core/models/base.model';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.scss']
})
export class LedgerComponent implements OnInit {
  private accountingService = inject(AccountingService);

  entries: LedgerEntry[] = [];
  balance: AccountBalance | null = null;
  loading = false;

  // فلاتر البحث
  startDate: string = '';
  endDate: string = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // جلب الرصيد
    this.accountingService.getAccountBalance().subscribe(b => this.balance = b);

    // جلب القيود (إما الكل أو حسب التاريخ)
    let entriesObs$;
    if (this.startDate && this.endDate) {
      entriesObs$ = this.accountingService.getLedgerByDateRange(this.startDate, this.endDate);
    } else {
      entriesObs$ = this.accountingService.getLedgerEntries();
    }

    entriesObs$.subscribe({
      next: (data) => {
        this.entries = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ledger:', err);
        this.loading = false;
      }
    });
  }

  filterByDate(): void {
    this.loadData();
  }

  resetFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadData();
  }

  exportData(): void {
    this.accountingService.generateFinancialReport(
      this.startDate || '2024-01-01',
      this.endDate || new Date().toISOString(),
      'profit_loss'
    ).subscribe(blob => {
      // منطق تحميل الملف
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'financial-report.csv'; // أو pdf حسب الباك اند
      a.click();
    });
  }

  // تنسيق العملة
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currency }).format(amount);
  }
}
