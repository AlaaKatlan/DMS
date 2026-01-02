import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  Project,
  ProjectMilestone,
  ProjectStats,
  ProjectStatus
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService extends BaseService<Project> {
  protected override tableName = 'projects';

  protected override getSearchColumns(): string[] {
    return ['title', 'project_type'];
  }

  // ==================== PROJECTS ====================

  getProjectsWithRelations(): Observable<Project[]> {
    this.setLoading(true);
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          customer:customers(id, name, email, phone),
          tasks:project_tasks(id, title, status, assignee_id),
          milestones:project_milestones(id, title, amount, status)
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as Project[]);
            this.clearError();
            observer.next(data as Project[]);
            observer.complete();
          }
          this.setLoading(false);
        });
    });
  }

  getProjectDetail(projectId: string): Observable<Project | null> {
    this.setLoading(true);
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          customer:customers(id, name, email, phone, country:countries(name)),
          tasks:project_tasks(
            id, title, status, priority, start_date, due_date,
            assignee:profiles(id, full_name, avatar_url)
          ),
          milestones:project_milestones(
            id, title, amount, due_date, status, completed_at
          ),
          invoices:invoices(
            id, invoice_number, amount_due, status
          ),
          expenses:expenses(
            id, title, amount, expense_date, approved
          )
        `)
        .eq('id', projectId)
        .single()
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.clearError();
            observer.next(data as Project);
            observer.complete();
          }
          this.setLoading(false);
        });
    });
  }

  getProjectsByStatus(status: ProjectStatus): Observable<Project[]> {
    return this.getFiltered({ column: 'status', value: status });
  }

  getProjectsByCustomer(customerId: string): Observable<Project[]> {
    return this.getFiltered({ column: 'customer_id', value: customerId });
  }

  getActiveProjects(): Observable<Project[]> {
    return this.getProjectsByStatus('active');
  }

  getOverdueProjects(): Observable<Project[]> {
    const today = new Date().toISOString().split('T')[0];
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`*, customer:customers(id, name)`)
        .eq('status', 'active')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) { observer.error(error); }
          else { observer.next(data as Project[]); observer.complete(); }
        });
    });
  }

  updateProjectStatus(projectId: string, status: ProjectStatus): Observable<Project> {
    const updates: Partial<Project> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    return this.update(projectId, updates);
  }

  // ==================== MILESTONES (تم الإصلاح هنا باستخدام as any) ====================

  getProjectMilestones(projectId: string): Observable<ProjectMilestone[]> {
    return new Observable(observer => {
      // استخدام (as any) لتجاوز مشاكل الأنواع مع الجداول غير المعرفة
      (this.supabase.client as any)
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else { observer.next(data as ProjectMilestone[]); observer.complete(); }
        });
    });
  }

  createMilestone(milestone: Omit<ProjectMilestone, 'id' | 'created_at'>): Observable<ProjectMilestone> {
    return new Observable(observer => {
      const payload = {
        project_id: milestone.project_id,
        title: milestone.title,
        amount: milestone.amount,
        due_date: milestone.due_date,
        status: milestone.status ?? 'pending'
      };

      // ✅ الحل الجذري: تحويل الـ client إلى any
      (this.supabase.client as any)
        .from('project_milestones')
        .insert(payload) // الآن لن يظهر خطأ never
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else { observer.next(data as ProjectMilestone); observer.complete(); }
        });
    });
  }

  updateMilestone(id: string, data: Partial<ProjectMilestone>): Observable<ProjectMilestone> {
    return new Observable(observer => {
      // ✅ الحل الجذري هنا أيضاً
      (this.supabase.client as any)
        .from('project_milestones')
        .update(data)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }: any) => {
          if (error) observer.error(error);
          else { observer.next(data as ProjectMilestone); observer.complete(); }
        });
    });
  }

  completeMilestone(milestoneId: string): Observable<ProjectMilestone> {
    return this.updateMilestone(milestoneId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  deleteMilestone(milestoneId: string): Observable<void> {
    return new Observable(observer => {
      (this.supabase.client as any)
        .from('project_milestones')
        .delete()
        .eq('id', milestoneId)
        .then(({ error }: any) => {
          if (error) observer.error(error);
          else { observer.next(); observer.complete(); }
        });
    });
  }

  // ==================== STATISTICS ====================

  getProjectStats(projectId: string): Observable<any> {
    return this.supabase.rpc('get_project_stats', { p_id: projectId });
  }

  getOverallStats(): Observable<ProjectStats> {
    return this.supabase.rpc('get_overall_project_stats', {});
  }

  calculateProgress(projectId: string): Observable<number> {
    return new Observable(observer => {
      this.supabase.client
        .from('project_tasks')
        .select('status')
        .eq('project_id', projectId)
        .then(({ data, error }: any) => {
          if (error) {
            observer.next(0);
            observer.complete();
          } else {
            const tasks = data || [];
            if (tasks.length === 0) {
              observer.next(0);
            } else {
              const completed = tasks.filter((t: any) => t.status === 'completed').length;
              observer.next(Math.round((completed / tasks.length) * 100));
            }
            observer.complete();
          }
        });
    });
  }

  // ==================== FINANCIAL ====================

  calculateProjectCost(projectId: string): Observable<number> {
    return new Observable(observer => {
      this.supabase.client
        .from('expenses')
        .select('amount')
        .eq('project_id', projectId)
        .eq('approved', true)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const total = (data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
            observer.next(total);
            observer.complete();
          }
        });
    });
  }

  calculateProjectRevenue(projectId: string): Observable<number> {
    return new Observable(observer => {
      this.supabase.client
        .from('invoices')
        .select('amount_due')
        .eq('project_id', projectId)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const total = (data || []).reduce((sum: number, i: any) => sum + (i.amount_due || 0), 0);
            observer.next(total);
            observer.complete();
          }
        });
    });
  }

  // ==================== VALIDATION ====================

  async isProjectTitleExists(title: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase.client
      .from(this.tableName)
      .select('id')
      .eq('title', title);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data?.length || 0) > 0;
  }

  // ==================== EXPORT ====================

  getProjectsForExport(): Observable<any[]> {
    return this.getProjectsWithRelations().pipe(
      map((projects: Project[]) =>
        projects.map(p => ({
          'العنوان': p.title,
          'العميل': p.customer?.name || '-',
          'النوع': p.project_type || '-',
          'الحالة': p.status,
          'السعر': p.total_price || 0,
          'العملة': p.currency,
          'تاريخ البدء': p.start_date || '-',
          'تاريخ التسليم': p.due_date || '-',
          'تاريخ الإنشاء': new Date(p.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }

  generateProjectReport(projectId: string): Observable<any> {
    return this.supabase.rpc('generate_project_report', { project_id: projectId });
  }
}
