// // src/app/features/invoices/invoices.service.ts
// import { Injectable } from '@angular/core';
// import { Observable, map } from 'rxjs';
// import { BaseService } from '../../core/services/base.service';
// import {
//   Invoice,
//   InvoiceItem,
//   InvoicePayment,
//   InvoiceStatus,
//   Currency,
//   PaymentMethod
// } from '../../core/models/base.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class InvoicesService extends BaseService<Invoice> {
//   protected override tableName = 'invoices';

//   protected override getSearchColumns(): string[] {
//     return ['invoice_number', 'notes'];
//   }

//   // ==================== INVOICES ====================

//   /**
//    * Get invoices with relations
//    */
//   getInvoicesWithRelations(): Observable<Invoice[]> {
//     this.setLoading(true);

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           customer:customers(id, name, email, phone),
//           project:projects(id, title),
//           items:invoice_items(id, description, quantity, unit_price, total),
//           payments:invoice_payments(id, amount, paid_at, payment_method)
//         `)
//         .order('created_at', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             this.setError(error.message);
//             observer.error(error);
//           } else {
//             this.items$.next(data as Invoice[]);
//             this.clearError();
//             observer.next(data as Invoice[]);
//             observer.complete();
//           }

//           this.setLoading(false);
//         });
//     });
//   }

//   /**
//    * Get invoice detail
//    */
//   getInvoiceDetail(invoiceId: string): Observable<Invoice | null> {
//     this.setLoading(true);

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           customer:customers(
//             id,
//             name,
//             email,
//             phone,
//             address,
//             country:countries(name)
//           ),
//           project:projects(id, title, project_type),
//           items:invoice_items(
//             id,
//             description,
//             quantity,
//             unit_price,
//             total,
//             book:books(book_id, title)
//           ),
//           payments:invoice_payments(
//             id,
//             amount,
//             payment_method,
//             transfer_ref,
//             paid_at,
//             notes
//           )
//         `)
//         .eq('id', invoiceId)
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             this.setError(error.message);
//             observer.error(error);
//           } else {
//             this.clearError();
//             observer.next(data as Invoice);
//             observer.complete();
//           }

//           this.setLoading(false);
//         });
//     });
//   }

//   /**
//    * Get invoices by customer
//    */
//   getCustomerInvoices(customerId: string): Observable<Invoice[]> {
//     return this.getFiltered({
//       column: 'customer_id',
//       value: customerId
//     });
//   }

//   /**
//    * Get invoices by project
//    */
//   getProjectInvoices(projectId: string): Observable<Invoice[]> {
//     return this.getFiltered({
//       column: 'project_id',
//       value: projectId
//     });
//   }

//   /**
//    * Get invoices by status
//    */
//   getInvoicesByStatus(status: InvoiceStatus): Observable<Invoice[]> {
//     return this.getFiltered({
//       column: 'status',
//       value: status
//     });
//   }

//   /**
//    * Get unpaid invoices
//    */
//   getUnpaidInvoices(): Observable<Invoice[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           customer:customers(id, name, phone)
//         `)
//         .in('status', ['unpaid', 'partially_paid'])
//         .order('due_date', { ascending: true })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Invoice[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get overdue invoices
//    */
//   getOverdueInvoices(): Observable<Invoice[]> {
//     const today = new Date().toISOString().split('T')[0];

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           customer:customers(id, name, email, phone)
//         `)
//         .in('status', ['unpaid', 'partially_paid'])
//         .lt('due_date', today)
//         .order('due_date', { ascending: true })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as Invoice[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Generate invoice number
//    */
//   async generateInvoiceNumber(): Promise<string> {
//     const year = new Date().getFullYear();
//     const { data, error } = await this.supabase.client
//       .from(this.tableName)
//       .select('invoice_number')
//       .like('invoice_number', `INV-${year}-%`)
//       .order('created_at', { ascending: false })
//       .limit(1);

//     if (error) throw error;

//     let nextNumber = 1;
//     if (data && data.length > 0) {
//       const lastNumber = parseInt(data[0].invoice_number.split('-')[2]);
//       nextNumber = lastNumber + 1;
//     }

//     return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
//   }

//   /**
//    * Update invoice status
//    */
//   updateInvoiceStatus(invoiceId: string): Observable<Invoice> {
//     return new Observable(observer => {
//       // Calculate total paid
//       this.supabase.client
//         .from('invoice_payments')
//         .select('amount')
//         .eq('invoice_id', invoiceId)
//         .then(({ data: payments, error: paymentsError }: any) => {
//           if (paymentsError) {
//             observer.error(paymentsError);
//             return;
//           }

//           const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

//           // Get invoice
//           this.supabase.client
//             .from(this.tableName)
//             .select('amount_due')
//             .eq('id', invoiceId)
//             .single()
//             .then(({ data: invoice, error: invoiceError }: any) => {
//               if (invoiceError) {
//                 observer.error(invoiceError);
//                 return;
//               }

//               let status: InvoiceStatus = 'unpaid';
//               if (totalPaid >= invoice.amount_due) {
//                 status = 'paid';
//               } else if (totalPaid > 0) {
//                 status = 'partially_paid';
//               }

//               // Update status
//               this.update(invoiceId, { status }).subscribe({
//                 next: (updated) => observer.next(updated),
//                 error: (err) => observer.error(err),
//                 complete: () => observer.complete()
//               });
//             });
//         });
//     });
//   }

//   // ==================== INVOICE ITEMS ====================

//   /**
//    * Add item to invoice
//    */
//   addInvoiceItem(item: Omit<InvoiceItem, 'id' | 'created_at'>): Observable<InvoiceItem> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_items')
//         .insert({
//           invoice_id: item.invoice_id,
//           description: item.description,
//           quantity: item.quantity,
//           unit_price: item.unit_price,
//           total: item.total,
//           book_id: item.book_id
//         } as any)
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as InvoiceItem);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Update invoice item
//    */
//   updateInvoiceItem(itemId: string, updates: Partial<InvoiceItem>): Observable<InvoiceItem> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_items')
//         .update(updates as any)
//         .eq('id', itemId)
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as InvoiceItem);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Delete invoice item
//    */
//   deleteInvoiceItem(itemId: string): Observable<void> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_items')
//         .delete()
//         .eq('id', itemId)
//         .then(({ error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next();
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== PAYMENTS ====================

//   /**
//    * Add payment to invoice
//    */
//   addInvoicePayment(payment: Omit<InvoicePayment, 'id' | 'created_at'>): Observable<InvoicePayment> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_payments')
//         .insert({
//           invoice_id: payment.invoice_id,
//           amount: payment.amount,
//           payment_method: payment.payment_method,
//           transfer_ref: payment.transfer_ref,
//           receipt_path: payment.receipt_path,
//           paid_at: payment.paid_at,
//           notes: payment.notes
//         } as any)
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             // Update invoice status
//             this.updateInvoiceStatus(payment.invoice_id).subscribe();
//             observer.next(data as InvoicePayment);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get invoice payments
//    */
//   getInvoicePayments(invoiceId: string): Observable<InvoicePayment[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_payments')
//         .select('*')
//         .eq('invoice_id', invoiceId)
//         .order('paid_at', { ascending: false })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as InvoicePayment[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Delete invoice payment
//    */
//   deleteInvoicePayment(paymentId: string, invoiceId: string): Observable<void> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from('invoice_payments')
//         .delete()
//         .eq('id', paymentId)
//         .then(({ error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             // Update invoice status
//             this.updateInvoiceStatus(invoiceId).subscribe();
//             observer.next();
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== CALCULATIONS ====================

//   /**
//    * Calculate invoice totals
//    */
//   calculateInvoiceTotals(items: InvoiceItem[], taxRate: number = 0, discount: number = 0): {
//     subtotal: number;
//     tax: number;
//     discount: number;
//     total: number;
//   } {
//     const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
//     const tax = subtotal * (taxRate / 100);
//     const total = subtotal + tax - discount;

//     return { subtotal, tax, discount, total };
//   }

//   /**
//    * Get total paid for invoice
//    */
//   getTotalPaid(invoiceId: string): Observable<number> {
//     return this.getInvoicePayments(invoiceId).pipe(
//       map((payments: InvoicePayment[]) =>
//         payments.reduce((sum, p) => sum + p.amount, 0)
//       )
//     );
//   }

//   /**
//    * Get remaining balance
//    */
//   getRemainingBalance(invoiceId: string): Observable<number> {
//     return new Observable(observer => {
//       Promise.all([
//         this.getById(invoiceId).toPromise(),
//         this.getTotalPaid(invoiceId).toPromise()
//       ]).then(([invoice, totalPaid]) => {
//         const remaining = (invoice?.amount_due || 0) - (totalPaid || 0);
//         observer.next(remaining);
//         observer.complete();
//       }).catch(error => observer.error(error));
//     });
//   }

//   // ==================== STATISTICS ====================

//   /**
//    * Get invoice statistics
//    */
//   getInvoiceStats(): Observable<{
//     total: number;
//     paid: number;
//     unpaid: number;
//     overdue: number;
//     totalAmount: number;
//     paidAmount: number;
//     unpaidAmount: number;
//   }> {
//     return this.supabase.rpc('get_invoice_stats', {});
//   }

//   // ==================== EXPORT ====================

//   /**
//    * Get invoices for export
//    */
//   getInvoicesForExport(): Observable<any[]> {
//     return this.getInvoicesWithRelations().pipe(
//       map((invoices: Invoice[]) =>
//         invoices.map(inv => ({
//           'رقم الفاتورة': inv.invoice_number,
//           'العميل': inv.customer?.name || '-',
//           'المشروع': inv.project?.title || '-',
//           'المبلغ': inv.amount_due,
//           'العملة': inv.currency,
//           'الحالة': inv.status,
//           'تاريخ الإصدار': new Date(inv.issue_date).toLocaleDateString('ar-SA'),
//           'تاريخ الاستحقاق': inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-SA') : '-',
//           'تاريخ الإنشاء': new Date(inv.created_at).toLocaleDateString('ar-SA')
//         }))
//       )
//     );
//   }

//   /**
//    * Generate invoice PDF
//    */
//   generateInvoicePDF(invoiceId: string): Observable<Blob> {
//     // سيتم استخدام Supabase Edge Function
//     return this.supabase.rpc('generate_invoice_pdf', { invoice_id: invoiceId });
//   }
// }
