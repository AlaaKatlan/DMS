// src/app/shared/services/excel-export.service.ts
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  /**
   * تصدير بيانات إلى Excel
   * @param data البيانات المراد تصديرها
   * @param fileName اسم الملف
   * @param sheetName اسم الورقة
   */
  exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1'): void {
    // إنشاء ورقة عمل من البيانات
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // تحسين عرض الأعمدة تلقائياً
    const colWidths = this.calculateColumnWidths(data);
    worksheet['!cols'] = colWidths;

    // إنشاء كتاب عمل جديد
    const workbook: XLSX.WorkBook = {
      Sheets: { [sheetName]: worksheet },
      SheetNames: [sheetName]
    };

    // حفظ الملف
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    this.saveAsExcelFile(excelBuffer, fileName);
  }

  /**
   * تصدير عدة أوراق في ملف واحد
   */
  exportMultipleSheets(
    sheets: Array<{ data: any[], sheetName: string }>,
    fileName: string
  ): void {
    const workbook: XLSX.WorkBook = {
      Sheets: {},
      SheetNames: []
    };

    sheets.forEach(sheet => {
      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(sheet.data);
      const colWidths = this.calculateColumnWidths(sheet.data);
      worksheet['!cols'] = colWidths;

      workbook.Sheets[sheet.sheetName] = worksheet;
      workbook.SheetNames.push(sheet.sheetName);
    });

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    this.saveAsExcelFile(excelBuffer, fileName);
  }

  /**
   * حساب عرض الأعمدة تلقائياً
   */
  private calculateColumnWidths(data: any[]): any[] {
    if (!data || data.length === 0) return [];

    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(obj => {
          const value = obj[key];
          return value ? value.toString().length : 0;
        })
      );
      return { wch: Math.min(maxLength + 2, 50) }; // حد أقصى 50 حرف
    });
  }

  /**
   * حفظ الملف
   */
  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(data);
    link.download = `${fileName}_${this.getDateString()}.xlsx`;
    link.click();

    // تنظيف
    setTimeout(() => {
      window.URL.revokeObjectURL(link.href);
    }, 100);
  }

  /**
   * الحصول على التاريخ الحالي كنص
   */
  private getDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * تصدير مع تنسيق مخصص
   */
  exportWithFormatting(
    data: any[],
    fileName: string,
    options?: {
      sheetName?: string;
      headerStyle?: any;
      columnWidths?: number[];
    }
  ): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // تطبيق عرض الأعمدة المخصص
    if (options?.columnWidths) {
      worksheet['!cols'] = options.columnWidths.map(w => ({ wch: w }));
    } else {
      worksheet['!cols'] = this.calculateColumnWidths(data);
    }

    const workbook: XLSX.WorkBook = {
      Sheets: { [options?.sheetName || 'Sheet1']: worksheet },
      SheetNames: [options?.sheetName || 'Sheet1']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    this.saveAsExcelFile(excelBuffer, fileName);
  }
}
