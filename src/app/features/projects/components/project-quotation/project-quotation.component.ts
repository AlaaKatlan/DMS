// src/app/features/projects/components/project-quotation/project-quotation.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Project, ProjectTask } from '../../../../core/models/base.model';

interface QuotationLine {
  index: number;
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  assignee_name: string;
  assignee_role: string;
}

interface QuotationSummary {
  subtotal: number;
  discount: number;
  grand_total: number;
  currency: string;
  items_count: number;
}

@Component({
  selector: 'app-project-quotation',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule,  ],
  template: `
    <div class="quotation-wrapper" dir="rtl">

      <!-- Header Actions Bar -->
      <div class="actions-bar no-print">
        <div class="bar-info">
          <lucide-angular name="file-text" [size]="18"></lucide-angular>
          <span>جدول خدمات المشروع</span>
          <span class="items-badge">{{ lines.length }} خدمة</span>
        </div>
        <div class="bar-actions">
          <button class="btn-secondary" (click)="toggleExpand()">
            <lucide-angular [name]="expanded ? 'chevron-up' : 'chevron-down'" [size]="16"></lucide-angular>
            {{ expanded ? 'إخفاء' : 'عرض الجدول' }}
          </button>
          <button class="btn-print" (click)="printQuotation()" [disabled]="lines.length === 0">
            <lucide-angular name="printer" [size]="16"></lucide-angular>
            طباعة / PDF
          </button>
        </div>
      </div>

      <!-- Quotation Table Section -->
      <div class="quotation-section" [class.collapsed]="!expanded">

        <!-- Empty State -->
        <div *ngIf="lines.length === 0" class="empty-state">
          <lucide-angular name="clipboard-list" [size]="40"></lucide-angular>
          <p>لا توجد خدمات مضافة لهذا المشروع بعد.</p>
          <small>قم بإضافة خدمات من نموذج تعديل المشروع.</small>
        </div>

        <!-- Table -->
        <div *ngIf="lines.length > 0" class="table-container">
          <table class="services-table">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-service">الخدمة / البند</th>

                <th class="col-qty">الكمية</th>
                <th class="col-price">سعر الوحدة</th>
                <th class="col-total">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let line of lines" class="service-row">
                <td class="col-num">
                  <span class="num-badge">{{ line.index }}</span>
                </td>
                <td class="col-service">
                  <div class="service-info">
                    <span class="service-title">{{ line.title }}</span>
                    <span class="service-desc" *ngIf="line.description">{{ line.description }}</span>
                  </div>
                </td>

                <td class="col-qty">{{ line.quantity }}</td>
                <td class="col-price">
                  {{ line.unit_price | number:'1.2-2' }}
                  <span class="currency-tag">{{ summary.currency }}</span>
                </td>
                <td class="col-total">
                  <strong>{{ line.total | number:'1.2-2' }}</strong>
                  <span class="currency-tag">{{ summary.currency }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="5" class="label-cell">المجموع قبل الخصم</td>
                <td class="value-cell">{{ summary.subtotal | number:'1.2-2' }} {{ summary.currency }}</td>
              </tr>
              <tr *ngIf="summary.discount > 0" class="discount-row">
                <td colspan="5" class="label-cell">الخصم</td>
                <td class="value-cell discount">— {{ summary.discount | number:'1.2-2' }} {{ summary.currency }}</td>
              </tr>
              <tr class="grand-total-row">
                <td colspan="5" class="label-cell">
                  <strong>الإجمالي النهائي</strong>
                </td>
                <td class="value-cell grand">
                  <strong>{{ summary.grand_total | number:'1.2-2' }} {{ summary.currency }}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .quotation-wrapper {
      border: 0.5px solid var(--color-border-tertiary);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      margin-bottom: 1.5rem;
    }

    /* Actions Bar */
    .actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.875rem 1.25rem;
      background: var(--color-background-secondary);
      border-bottom: 0.5px solid var(--color-border-tertiary);
    }

    .bar-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);

      lucide-angular { color: var(--color-text-secondary); }
    }

    .items-badge {
      background: var(--color-background-info);
      color: var(--color-text-info);
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--border-radius-md);
    }

    .bar-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-secondary, .btn-print {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--border-radius-md);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 0.5px solid var(--color-border-secondary);
      transition: all 0.15s;
    }

    .btn-secondary {
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      &:hover { background: var(--color-background-secondary); }
    }

    .btn-print {
      background: #1a6b3c;
      color: #ffffff;
      border-color: #1a6b3c;
      &:hover { background: #0f4a2a; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* Table Section */
    .quotation-section {
      background: var(--color-background-primary);
      overflow: hidden;
      transition: max-height 0.3s ease;
      max-height: 2000px;

      &.collapsed { max-height: 0; }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem;
      text-align: center;
      color: var(--color-text-secondary);

      lucide-angular { opacity: 0.4; }
      p { font-size: 14px; font-weight: 500; margin: 0; }
      small { font-size: 12px; color: var(--color-text-tertiary); }
    }

    /* Table */
    .table-container { overflow-x: auto; }

    .services-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;

      thead tr {
        background: var(--color-background-secondary);
        border-bottom: 0.5px solid var(--color-border-tertiary);

        th {
          padding: 0.75rem 1rem;
          text-align: right;
          font-weight: 500;
          font-size: 12px;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
      }

      tbody .service-row {
        border-bottom: 0.5px solid var(--color-border-tertiary);
        transition: background 0.1s;

        &:hover { background: var(--color-background-secondary); }
        &:last-child { border-bottom: none; }

        td { padding: 0.875rem 1rem; vertical-align: middle; }
      }

      tfoot {
        border-top: 0.5px solid var(--color-border-tertiary);
        background: var(--color-background-secondary);

        tr td { padding: 0.625rem 1rem; }

        .label-cell {
          text-align: right;
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .value-cell {
          text-align: left;
          font-size: 13px;
          color: var(--color-text-primary);
          white-space: nowrap;
        }

        .subtotal-row { border-top: 0.5px solid var(--color-border-tertiary); }

        .discount-row .value-cell.discount {
          color: var(--color-text-danger);
        }

        .grand-total-row {
          border-top: 1px solid var(--color-border-secondary);
          .label-cell strong { font-size: 14px; color: var(--color-text-primary); }
          .value-cell.grand strong { font-size: 15px; color: #1a6b3c; }
        }
      }
    }

    /* Column widths */
    .col-num { width: 48px; text-align: center; }
    .col-service { min-width: 180px; }
    .col-assignee { min-width: 140px; }
    .col-qty { width: 70px; text-align: center; }
    .col-price { width: 120px; text-align: left; }
    .col-total { width: 130px; text-align: left; }

    /* Cell content */
    .num-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-background-secondary);
      font-size: 11px;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .service-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .service-title { font-weight: 500; color: var(--color-text-primary); }
      .service-desc { font-size: 12px; color: var(--color-text-tertiary); }
    }

    .assignee-cell {
      display: flex;
      align-items: center;
      gap: 8px;

      .assignee-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-background-info);
        color: var(--color-text-info);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 500;
        flex-shrink: 0;
      }

      .assignee-info {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .assignee-name { font-size: 13px; color: var(--color-text-primary); }
        .assignee-role {
          font-size: 10px;
          color: var(--color-text-warning);
          background: var(--color-background-warning);
          padding: 1px 5px;
          border-radius: 3px;
          width: fit-content;
        }
      }
    }

    .no-assignee { color: var(--color-text-tertiary); }

    .currency-tag {
      font-size: 11px;
      color: var(--color-text-tertiary);
      margin-right: 3px;
    }

    @media print { .no-print { display: none !important; } }
  `]
})
export class ProjectQuotationComponent implements OnChanges {
  @Input() project!: Project;

  lines: QuotationLine[] = [];
  summary: QuotationSummary = {
    subtotal: 0, discount: 0, grand_total: 0,
    currency: 'USD', items_count: 0
  };
  expanded = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project) {
      this.buildQuotationLines();
    }
  }

  private buildQuotationLines(): void {
    const tasks = this.project.tasks || [];

    this.lines = tasks
      .filter(t => (t.unit_price || 0) > 0 || (t.quantity || 0) > 0)
      .map((t, i) => {
        const qty = t.quantity || 1;
        const price = t.unit_price || 0;
        return {
          index: i + 1,
          title: t.title,
          description: t.description || '',
          quantity: qty,
          unit_price: price,
          total: qty * price,
          assignee_name: t.assignee?.full_name || (t.supplier as any)?.name || '',
          assignee_role: t.assignee?.role || ''
        };
      });

    const subtotal = this.lines.reduce((s, l) => s + l.total, 0);
    const projectTotal = this.project.total_price || 0;
    const discount = Math.max(0, subtotal - projectTotal);

    this.summary = {
      subtotal,
      discount,
      grand_total: projectTotal > 0 ? projectTotal : subtotal,
      currency: this.project.currency || 'USD',
      items_count: this.lines.length
    };
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  printQuotation(): void {
    if (!this.project || this.lines.length === 0) return;
    const html = this.buildPrintHTML();
    const win = window.open('', '_blank', 'width=1000,height=800');
    win?.document.write(html);
    win?.document.close();
  }

  private buildPrintHTML(): string {
    const p = this.project;
    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

    const rows = this.lines.map((line, i) => `
      <tr style="${i % 2 === 1 ? 'background:#fafafa;' : ''}">
        <td style="padding:10px 14px;text-align:center;color:#9ca3af;font-weight:500;">${line.index}</td>
        <td style="padding:10px 14px;">
          <div style="font-weight:600;color:#111827;">${line.title}</div>
          ${line.description ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${line.description}</div>` : ''}
        </td>

        <td style="padding:10px 14px;text-align:center;color:#374151;">${line.quantity}</td>
        <td style="padding:10px 14px;text-align:left;color:#374151;font-family:monospace;">${fmt(line.unit_price)}</td>
        <td style="padding:10px 14px;text-align:left;font-weight:700;color:#1a6b3c;font-family:monospace;">${fmt(line.total)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>${p.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Cairo', sans-serif; background: white; color: #111827; direction: rtl; padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { body { padding: 16px; } @page { margin: 0.5cm; size: A4; } }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:28px;border-bottom:2px solid #1a6b3c;">
  <div style="display:flex;align-items:flex-start;gap:16px;">
    <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="16" fill="#1a6b3c"/>
      <path d="M28 50L44 66L72 34" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div>
      <div style="font-size:22px;font-weight:800;color:#1a6b3c;">دار الزيبق</div>
      <div style="font-size:13px;color:#6b7280;margin-top:3px;">للنشر والإنتاج  </div>
    </div>
  </div>

</div>

<!-- Project & Client Info -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
  <div style="background:#f9fafb;padding:16px;border-radius:10px;border:1px solid #e5e7eb;">
    <div style="font-size:11px;color:#6b7280;font-weight:600;margin-bottom:10px;text-transform:uppercase;">تفاصيل المشروع</div>
    <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:8px;">${p.title}</div>

  </div>
  <div style="background:#f9fafb;padding:16px;border-radius:10px;border:1px solid #e5e7eb;">
    <div style="font-size:11px;color:#6b7280;font-weight:600;margin-bottom:10px;text-transform:uppercase;">العميل</div>
    ${p.customer ? `
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:8px;">${p.customer.name}</div>

    ` : '<div style="font-size:14px;color:#9ca3af;">غير محدد</div>'}
  </div>
</div>

<!-- Services Table -->
<div style="margin-bottom:20px;">
  <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
    <span style="display:inline-block;width:4px;height:18px;background:#1a6b3c;border-radius:2px;"></span>
    جدول الخدمات والبنود
  </div>
  <div style="border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#1a6b3c;">
          <th style="padding:11px 14px;text-align:center;color:white;font-weight:600;width:44px;">#</th>
          <th style="padding:11px 14px;text-align:right;color:white;font-weight:600;">الخدمة / البند</th>

          <th style="padding:11px 14px;text-align:center;color:white;font-weight:600;width:70px;">الكمية</th>
          <th style="padding:11px 14px;text-align:left;color:white;font-weight:600;width:110px;">سعر الوحدة</th>
          <th style="padding:11px 14px;text-align:left;color:white;font-weight:600;width:120px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>

<!-- Totals -->
<div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
  <div style="width:300px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;">
      <span style="color:#6b7280;">المجموع الجزئي</span>
      <span style="font-family:monospace;font-weight:500;">${fmt(this.summary.subtotal)} ${this.summary.currency}</span>
    </div>
    ${this.summary.discount > 0 ? `
    <div style="display:flex;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;">
      <span style="color:#dc2626;">الخصم</span>
      <span style="font-family:monospace;font-weight:500;color:#dc2626;">— ${fmt(this.summary.discount)} ${this.summary.currency}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;padding:14px 16px;background:#f0fdf4;font-size:15px;">
      <span style="font-weight:700;color:#111827;">الإجمالي النهائي</span>
      <span style="font-family:monospace;font-weight:800;color:#1a6b3c;font-size:17px;">${fmt(this.summary.grand_total)} ${this.summary.currency}</span>
    </div>
  </div>
</div>

<!-- Signatures -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;">
  ${['اعتماد دار الزيبق', 'توقيع المدير', 'توقيع العميل / القبول'].map(label => `
  <div style="text-align:center;">
    <div style="height:60px;border-bottom:1px solid #d1d5db;margin-bottom:10px;"></div>
    <span style="font-size:12px;color:#9ca3af;">${label}</span>
  </div>`).join('')}
</div>

<!-- Footer -->
<div style="text-align:center;margin-top:28px;padding-top:20px;border-top:2px solid #1a6b3c;">
  <p style="color:#6b7280;font-size:12px;">   دار الزيبق للنشر والإنتاج  </p>
</div>

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
  }
}
