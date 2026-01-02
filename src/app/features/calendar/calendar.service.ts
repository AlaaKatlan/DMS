import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  type: 'project_start' | 'project_due' | 'task' | 'milestone';
  referenceId?: string; // ID of the project/task
  color?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private supabase = inject(SupabaseService);

  /**
   * جلب جميع الأحداث (مشاريع، مهام، محطات)
   */
  getAllEvents(): Observable<CalendarEvent[]> {
    return forkJoin({
      projects: this.getProjects(),
      tasks: this.getTasks(),
      milestones: this.getMilestones()
    }).pipe(
      map(({ projects, tasks, milestones }) => {
        return [...projects, ...tasks, ...milestones];
      })
    );
  }

  private getProjects(): Observable<CalendarEvent[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('projects')
        .select('id, title, start_date, due_date, status')
        .neq('status', 'cancelled') // تجاهل المشاريع الملغية
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else {
            const events: CalendarEvent[] = [];
            (data || []).forEach((p: any) => {
              // حدث بداية المشروع
              if (p.start_date) {
                events.push({
                  id: `p_start_${p.id}`,
                  title: `بدء: ${p.title}`,
                  date: p.start_date,
                  type: 'project_start',
                  referenceId: p.id,
                  color: '#3B82F6', // Blue
                  status: p.status
                });
              }
              // حدث تسليم المشروع
              if (p.due_date) {
                events.push({
                  id: `p_due_${p.id}`,
                  title: `تسليم: ${p.title}`,
                  date: p.due_date,
                  type: 'project_due',
                  referenceId: p.id,
                  color: '#EF4444', // Red
                  status: p.status
                });
              }
            });
            observer.next(events);
            observer.complete();
          }
        });
    });
  }

  private getTasks(): Observable<CalendarEvent[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('project_tasks')
        .select('id, title, due_date, status, project:projects(title)')
        .not('due_date', 'is', null)
        .neq('status', 'completed') // التركيز على المهام غير المنجزة
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else {
            const events = (data || []).map((t: any) => ({
              id: `task_${t.id}`,
              title: `مهمة: ${t.title}`,
              date: t.due_date,
              type: 'task',
              referenceId: t.id,
              color: '#10B981', // Green
              status: t.status
            }));
            observer.next(events);
            observer.complete();
          }
        });
    });
  }

  private getMilestones(): Observable<CalendarEvent[]> {
    return new Observable(observer => {
      // استخدام as any لتجنب مشاكل الـ typing مع الجداول الجديدة
      (this.supabase.client as any)
        .from('project_milestones')
        .select('id, title, due_date, status')
        .not('due_date', 'is', null)
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else {
            const events = (data || []).map((m: any) => ({
              id: `milestone_${m.id}`,
              title: `محطة: ${m.title}`,
              date: m.due_date,
              type: 'milestone',
              referenceId: m.id,
              color: '#F59E0B', // Orange
              status: m.status
            }));
            observer.next(events);
            observer.complete();
          }
        });
    });
  }
}
