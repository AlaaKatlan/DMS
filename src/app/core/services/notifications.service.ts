// src/app/core/services/notifications.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Notification, NotificationType } from '../models/base.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private supabase = inject(SupabaseService);

  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private unreadCount$ = new BehaviorSubject<number>(0);

  constructor() {
    this.subscribeToNotifications();
  }

  // ==================== OBSERVABLES ====================

  get notifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  get unreadCount(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  // ==================== NOTIFICATIONS ====================

  getUserNotifications(userId: string, limit: number = 50): Observable<Notification[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const notifications = data as Notification[];
            this.notifications$.next(notifications);
            this.updateUnreadCount(notifications);
            observer.next(notifications);
            observer.complete();
          }
        });
    });
  }

  getUnreadNotifications(userId: string): Observable<Notification[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as Notification[]);
            observer.complete();
          }
        });
    });
  }
createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Observable<Notification> {
  return new Observable(observer => {
    const payload: Record<string, any> = {
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      reference_type: notification.reference_type,
      reference_id: notification.reference_id,
      read: false
    };

    this.supabase.client
      .from('notifications')
      .insert(payload as never)  // ← إضافة as never هنا
      .select()
      .single()
      .then(({ data, error }: any) => {
        if (error) {
          observer.error(error);
        } else {
          observer.next(data as Notification);
          observer.complete();
        }
      });
  });
}

markAsRead(notificationId: string): Observable<Notification> {
  return new Observable(observer => {
    const updates: Record<string, any> = {
      read: true,
      read_at: new Date().toISOString()
    };

    this.supabase.client
      .from('notifications')
      .update(updates as never)  // ← إضافة as never هنا
      .eq('id', notificationId)
      .select()
      .single()
      .then(({ data, error }: any) => {
        if (error) {
          observer.error(error);
        } else {
          observer.next(data as Notification);
          observer.complete();
        }
      });
  });
}

markAllAsRead(userId: string): Observable<void> {
  return new Observable(observer => {
    const updates: Record<string, any> = {
      read: true,
      read_at: new Date().toISOString()
    };

    this.supabase.client
      .from('notifications')
      .update(updates as never)  // ← إضافة as never هنا
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ error }: any) => {
        if (error) {
          observer.error(error);
        } else {
          this.unreadCount$.next(0);
          observer.next();
          observer.complete();
        }
      });
  });
}

  deleteNotification(notificationId: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .then(({ error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next();
            observer.complete();
          }
        });
    });
  }

  deleteAllNotifications(userId: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .then(({ error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            this.notifications$.next([]);
            this.unreadCount$.next(0);
            observer.next();
            observer.complete();
          }
        });
    });
  }

  // ==================== NOTIFICATION CREATORS ====================

  notifyTaskAssigned(
    assigneeId: string,
    taskTitle: string,
    taskId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: assigneeId,
      title: 'مهمة جديدة',
      message: `تم تعيينك لمهمة: ${taskTitle}`,
      type: 'task_assigned',
      reference_type: 'task',
      reference_id: taskId,
      read: false
    });
  }

  notifyTaskCompleted(
    managerId: string,
    taskTitle: string,
    taskId: string,
    assigneeName: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: managerId,
      title: 'مهمة مكتملة',
      message: `أكمل ${assigneeName} المهمة: ${taskTitle}`,
      type: 'task_completed',
      reference_type: 'task',
      reference_id: taskId,
      read: false
    });
  }

  notifyPaymentReceived(
    userId: string,
    amount: number,
    currency: string,
    invoiceNumber: string,
    invoiceId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'دفعة مستلمة',
      message: `تم استلام دفعة بمبلغ ${amount} ${currency} للفاتورة ${invoiceNumber}`,
      type: 'payment_received',
      reference_type: 'invoice',
      reference_id: invoiceId,
      read: false
    });
  }

  notifyPaymentDue(
    userId: string,
    invoiceNumber: string,
    amount: number,
    invoiceId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'دفعة مستحقة',
      message: `الفاتورة ${invoiceNumber} بمبلغ ${amount} مستحقة قريباً`,
      type: 'payment_due',
      reference_type: 'invoice',
      reference_id: invoiceId,
      read: false
    });
  }

  notifyInvoiceOverdue(
    userId: string,
    invoiceNumber: string,
    daysOverdue: number,
    invoiceId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'فاتورة متأخرة',
      message: `الفاتورة ${invoiceNumber} متأخرة منذ ${daysOverdue} يوم`,
      type: 'invoice_overdue',
      reference_type: 'invoice',
      reference_id: invoiceId,
      read: false
    });
  }

  notifyProjectDeadline(
    userId: string,
    projectTitle: string,
    daysRemaining: number,
    projectId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'موعد تسليم قريب',
      message: `المشروع "${projectTitle}" موعد تسليمه بعد ${daysRemaining} يوم`,
      type: 'project_deadline',
      reference_type: 'project',
      reference_id: projectId,
      read: false
    });
  }

  notifyExpenseApproved(
    userId: string,
    expenseTitle: string,
    amount: number,
    expenseId: string
  ): Observable<Notification> {
    return this.createNotification({
      user_id: userId,
      title: 'مصروف معتمد',
      message: `تم اعتماد المصروف "${expenseTitle}" بمبلغ ${amount}`,
      type: 'expense_approved',
      reference_type: 'expense',
      reference_id: expenseId,
      read: false
    });
  }

  // ==================== REALTIME ====================

  private subscribeToNotifications(): void {
    const userId = this.supabase.currentUserValue?.id;
    if (!userId) return;

    this.supabase.client
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          const newNotification = payload.new as Notification;
          const current = this.notifications$.value;
          this.notifications$.next([newNotification, ...current]);
          this.updateUnreadCount([newNotification, ...current]);
        }
      )
      .subscribe();
  }

  private updateUnreadCount(notifications: Notification[]): void {
    const unread = notifications.filter(n => !n.read).length;
    this.unreadCount$.next(unread);
  }
}
