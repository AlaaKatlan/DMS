// // src/app/features/calendar/calendar.service.ts
// import { Injectable } from '@angular/core';
// import { Observable, map } from 'rxjs';
// import { BaseService } from '../../core/services/base.service';
// import {
//   CalendarEvent,
//   CalendarEventType
// } from '../../core/models/base.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class CalendarService extends BaseService<CalendarEvent> {
//   protected override tableName = 'calendar_events';

//   protected override getSearchColumns(): string[] {
//     return ['title', 'description'];
//   }

//   // ==================== EVENTS ====================

//   /**
//    * Get events with relations
//    */
//   getEventsWithRelations(): Observable<CalendarEvent[]> {
//     this.setLoading(true);

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           creator:profiles!created_by(id, full_name, avatar_url)
//         `)
//         .order('event_date', { ascending: true })
//         .then(({ data, error }: any) => {
//           if (error) {
//             this.setError(error.message);
//             observer.error(error);
//           } else {
//             this.items$.next(data as CalendarEvent[]);
//             this.clearError();
//             observer.next(data as CalendarEvent[]);
//             observer.complete();
//           }

//           this.setLoading(false);
//         });
//     });
//   }

//   /**
//    * Get events by date range
//    */
//   getEventsByDateRange(startDate: string, endDate: string): Observable<CalendarEvent[]> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           creator:profiles!created_by(id, full_name)
//         `)
//         .gte('event_date', startDate)
//         .lte('event_date', endDate)
//         .order('event_date', { ascending: true })
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as CalendarEvent[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Get events by month
//    */
//   getMonthEvents(year: number, month: number): Observable<CalendarEvent[]> {
//     const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
//     const endDate = new Date(year, month, 0).toISOString().split('T')[0];
//     return this.getEventsByDateRange(startDate, endDate);
//   }

//   /**
//    * Get today's events
//    */
//   getTodayEvents(): Observable<CalendarEvent[]> {
//     const today = new Date().toISOString().split('T')[0];
//     return this.getEventsByDateRange(today, today);
//   }

//   /**
//    * Get upcoming events
//    */
//   getUpcomingEvents(days: number = 7): Observable<CalendarEvent[]> {
//     const today = new Date().toISOString().split('T')[0];
//     const futureDate = new Date();
//     futureDate.setDate(futureDate.getDate() + days);
//     const endDate = futureDate.toISOString().split('T')[0];

//     return this.getEventsByDateRange(today, endDate);
//   }

//   /**
//    * Get events by type
//    */
//   getEventsByType(eventType: CalendarEventType): Observable<CalendarEvent[]> {
//     return this.getFiltered({
//       column: 'event_type',
//       value: eventType
//     });
//   }

//   /**
//    * Get events by user
//    */
//   getUserEvents(userId: string): Observable<CalendarEvent[]> {
//     return this.getFiltered({
//       column: 'created_by',
//       value: userId
//     });
//   }

//   /**
//    * Get events with reminders
//    */
//   getEventsWithReminders(): Observable<CalendarEvent[]> {
//     return this.getFiltered({
//       column: 'reminder_enabled',
//       value: true
//     });
//   }

//   // ==================== TASK EVENTS ====================

//   /**
//    * Create event from task
//    */
//   createTaskEvent(taskId: string, title: string, dueDate: string, assigneeId: string): Observable<CalendarEvent> {
//     return this.create({
//       title: title,
//       event_type: 'task',
//       reference_id: taskId,
//       event_date: dueDate,
//       all_day: false,
//       reminder_enabled: true,
//       reminder_minutes: 60,
//       created_by: assigneeId
//     });
//   }

//   /**
//    * Update task event when task changes
//    */
//   updateTaskEvent(taskId: string, newDueDate: string): Observable<CalendarEvent | null> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .update({
//           event_date: newDueDate
//         } as any)
//         .eq('reference_id', taskId)
//         .eq('event_type', 'task')
//         .select()
//         .single()
//         .then(({ data, error }: any) => {
//           if (error && error.code !== 'PGRST116') { // Not found error
//             observer.error(error);
//           } else {
//             observer.next(data as CalendarEvent);
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== PAYMENT EVENTS ====================

//   /**
//    * Create payment reminder event
//    */
//   createPaymentEvent(
//     invoiceId: string,
//     title: string,
//     dueDate: string,
//     userId: string
//   ): Observable<CalendarEvent> {
//     return this.create({
//       title: title,
//       event_type: 'payment',
//       reference_id: invoiceId,
//       event_date: dueDate,
//       all_day: false,
//       reminder_enabled: true,
//       reminder_minutes: 1440, // 24 hours
//       created_by: userId
//     });
//   }

//   // ==================== DELIVERY EVENTS ====================

//   /**
//    * Create delivery event
//    */
//   createDeliveryEvent(
//     orderId: string,
//     title: string,
//     deliveryDate: string,
//     userId: string
//   ): Observable<CalendarEvent> {
//     return this.create({
//       title: title,
//       event_type: 'delivery',
//       reference_id: orderId,
//       event_date: deliveryDate,
//       all_day: false,
//       reminder_enabled: true,
//       reminder_minutes: 120,
//       created_by: userId
//     });
//   }

//   // ==================== REMINDERS ====================

//   /**
//    * Get due reminders
//    */
//   getDueReminders(): Observable<CalendarEvent[]> {
//     const now = new Date();
//     const reminderTime = new Date(now.getTime() + 60 * 60 * 1000); // Next hour

//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select(`
//           *,
//           creator:profiles!created_by(id, full_name, email)
//         `)
//         .eq('reminder_enabled', true)
//         .gte('event_date', now.toISOString())
//         .lte('event_date', reminderTime.toISOString())
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as CalendarEvent[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   /**
//    * Snooze reminder
//    */
//   snoozeReminder(eventId: string, minutes: number): Observable<CalendarEvent> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select('event_date')
//         .eq('id', eventId)
//         .single()
//         .then(({ data: event, error: selectError }: any) => {
//           if (selectError) {
//             observer.error(selectError);
//             return;
//           }

//           const newDate = new Date(event.event_date);
//           newDate.setMinutes(newDate.getMinutes() + minutes);

//           this.supabase.client
//             .from(this.tableName)
//             .update({
//               event_date: newDate.toISOString()
//             } as any)
//             .eq('id', eventId)
//             .select()
//             .single()
//             .then(({ data, error }: any) => {
//               if (error) {
//                 observer.error(error);
//               } else {
//                 observer.next(data as CalendarEvent);
//                 observer.complete();
//               }
//             });
//         });
//     });
//   }

//   // ==================== RECURRING EVENTS ====================

//   /**
//    * Create recurring events
//    */
//   createRecurringEvents(
//     baseEvent: Omit<CalendarEvent, 'id' | 'created_at'>,
//     recurrence: 'daily' | 'weekly' | 'monthly',
//     occurrences: number
//   ): Observable<CalendarEvent[]> {
//     return new Observable(observer => {
//       const events: Array<Omit<CalendarEvent, 'id' | 'created_at'>> = [];
//       const startDate = new Date(baseEvent.event_date);

//       for (let i = 0; i < occurrences; i++) {
//         const eventDate = new Date(startDate);

//         switch (recurrence) {
//           case 'daily':
//             eventDate.setDate(eventDate.getDate() + i);
//             break;
//           case 'weekly':
//             eventDate.setDate(eventDate.getDate() + (i * 7));
//             break;
//           case 'monthly':
//             eventDate.setMonth(eventDate.getMonth() + i);
//             break;
//         }

//         events.push({
//           ...baseEvent,
//           event_date: eventDate.toISOString()
//         });
//       }

//       // Insert all events
//       this.supabase.client
//         .from(this.tableName)
//         .insert(events as any)
//         .select()
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             observer.next(data as CalendarEvent[]);
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== STATISTICS ====================

//   /**
//    * Get events count by type
//    */
//   getEventsCountByType(): Observable<Array<{ type: CalendarEventType; count: number }>> {
//     return new Observable(observer => {
//       this.supabase.client
//         .from(this.tableName)
//         .select('event_type')
//         .then(({ data, error }: any) => {
//           if (error) {
//             observer.error(error);
//           } else {
//             const events = data as CalendarEvent[];
//             const grouped = events.reduce((acc: any, event) => {
//               const type = event.event_type;
//               if (!acc[type]) {
//                 acc[type] = { type, count: 0 };
//               }
//               acc[type].count++;
//               return acc;
//             }, {});

//             observer.next(Object.values(grouped));
//             observer.complete();
//           }
//         });
//     });
//   }

//   // ==================== EXPORT ====================

//   /**
//    * Get events for export
//    */
//   getEventsForExport(startDate?: string, endDate?: string): Observable<any[]> {
//     const events$ = startDate && endDate
//       ? this.getEventsByDateRange(startDate, endDate)
//       : this.getEventsWithRelations();

//     return events$.pipe(
//       map((events: CalendarEvent[]) =>
//         events.map(e => ({
//           'العنوان': e.title,
//           'الوصف': e.description || '-',
//           'النوع': e.event_type,
//           'التاريخ': new Date(e.event_date).toLocaleDateString('ar-SA'),
//           'الوقت': new Date(e.event_date).toLocaleTimeString('ar-SA'),
//           'طوال اليوم': e.all_day ? 'نعم' : 'لا',
//           'التذكير': e.reminder_enabled ? 'نعم' : 'لا',
//           'قبل (دقائق)': e.reminder_minutes || '-',
//           'المنشئ': e.creator?.full_name || '-',
//           'تاريخ الإنشاء': new Date(e.created_at).toLocaleDateString('ar-SA')
//         }))
//       )
//     );
//   }
// }
