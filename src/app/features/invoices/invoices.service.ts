import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import { Invoice, InvoiceItem } from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService extends BaseService<Invoice> {
  protected override tableName = 'invoices';

  protected override getSearchColumns(): string[] {
    return ['invoice_number', 'customer.name'];
  }

  // --- علاقات البيانات ---

  getInvoicesWithRelations(): Observable<Invoice[]> {
    this.setLoading(true);
    return from(
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          customer:customers(id, name),
          project:projects(id, title)
        `)
        .order('created_at', { ascending: false })
    ).pipe(
      map((res: any) => {
        this.setLoading(false);
        if (res.error) throw res.error;
        return res.data as Invoice[];
      })
    );
  }

  getInvoiceDetail(id: string): Observable<Invoice | null> {
    this.setLoading(true);
    return from(
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          customer:customers(*),
          project:projects(*),
          items:invoice_items(*),
          payments:invoice_payments(*)
        `)
        .eq('id', id)
        .single()
    ).pipe(
      map((res: any) => {
        this.setLoading(false);
        if (res.error) throw res.error;
        return res.data as Invoice;
      })
    );
  }

  // --- طرق الدفع ---

  getPaymentMethods(): Observable<any[]> {
    return from(
      this.supabase.client
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ).pipe(map(({ data }) => data || []));
  }

  // --- العمليات (Create / Update) ---

  async createInvoiceWithItems(
    invoiceData: Partial<Invoice>,
    items: Partial<InvoiceItem>[],
    initialPayment?: { amount: number, method_id: string, notes?: string }
  ): Promise<Invoice> {

    // 1. توليد الرقم
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = await this.generateInvoiceNumber();
    }

    // 2. إنشاء الفاتورة (استخدام as any لتجنب أخطاء TypeScript)
    const { data: invoice, error: invError } = await (this.supabase.client
      .from(this.tableName) as any)
      .insert(invoiceData)
      .select()
      .single();

    if (invError) throw invError;

    // 3. إضافة العناصر
    if (items.length > 0 && invoice) {
      // بما أننا استخدمنا as any، المتغير invoice أصبح any ولن يعترض على id
      const itemsWithId = items.map(item => ({ ...item, invoice_id: invoice.id }));

      const { error: itemsError } = await (this.supabase.client
        .from('invoice_items') as any)
        .insert(itemsWithId);

      if (itemsError) throw itemsError;
    }

    // 4. تسجيل الدفعة الأولى (إذا وجدت)
    if (initialPayment && invoice) {
      // جلب اسم الطريقة
      const { data: methodData } = await (this.supabase.client
        .from('payment_methods') as any) // 👈 إضافة as any هنا لتصحيح خطأ 'name'
        .select('name')
        .eq('id', initialPayment.method_id)
        .single();

      // استخدام متغير وسيط لتجنب مشاكل النوع
      const methodName = methodData ? methodData.name : 'Unknown';

      const { error: payError } = await (this.supabase.client
        .from('invoice_payments') as any)
        .insert({
          invoice_id: invoice.id,
          amount: initialPayment.amount,
          payment_method: methodName,
          payment_method_id: initialPayment.method_id,
          paid_at: new Date(),
          notes: initialPayment.notes || 'دفعة أولية عند الإنشاء'
        });

      if (payError) console.error('Payment Error:', payError);
    }

    return invoice as Invoice;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const prefix = `INV-${new Date().getFullYear()}-`;

    // 👇 استخدام as any هنا لتصحيح خطأ 'invoice_number'
    const { data } = await (this.supabase.client
      .from(this.tableName) as any)
      .select('invoice_number')
      .ilike('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      // الآن TypeScript لن يعترض لأن data هو any
      const lastNumber = data[0].invoice_number;
      const sequence = parseInt(lastNumber.split('-')[2]) + 1;
      return `${prefix}${sequence.toString().padStart(3, '0')}`;
    }
    return `${prefix}001`;
  }


  getInvoicesByProject(projectId: string): Observable<Invoice[]> {
  return from(
    this.supabase.client
      .from(this.tableName)
      .select(`*, payments:invoice_payments(*)`)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
  ).pipe(
    map((res: any) => {
      if (res.error) throw res.error;
      return res.data as Invoice[];
    })
  );
}
}
