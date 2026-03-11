import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  Project,
  ProjectMilestone,
  ProjectStats,
  ProjectStatus,
  UserProfile
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService extends BaseService<Project> {
  protected override tableName = 'projects';

  protected override getSearchColumns(): string[] {
    return ['title', 'project_type'];
  }

  // ==================== FREELANCERS ====================

  getFreelancers(): Observable<UserProfile[]> {
    return new Observable(observer => {
      // Support different supabase client property names across base service versions
      const client = (this.supabase as any)?.client
                  || (this.supabase as any)?.supabaseClient
                  || (this.supabase as any);
      client
        .from('profiles')
        .select('id, full_name, role, email, phone')
        .eq('role', 'freelancer')
        .order('full_name', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            console.error('getFreelancers error:', error);
            observer.next([]);
          } else {
            console.log('✅ Freelancers loaded:', data?.length ?? 0, data);
            observer.next((data || []) as UserProfile[]);
          }
          observer.complete();
        });
    });
  }

  /**
   * ✅ حفظ عناصر المشروع بدون updated_at
   */
  async saveProjectItems(projectId: string, items: any[]): Promise<void> {
    if (!items || items.length === 0) return;

    for (const item of items) {
      const taskData = {
        project_id: projectId,
        title: item.title,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        assignee_id: item.assignee_id || null,
        description: item.description || null,
        task_type: 'parallel',
        status: 'todo',
        priority: 'medium'
        // ✅ لا updated_at ولا created_at — لا يوجد trigger عليهم في project_tasks
      };

      if (item.id) {
        const { error } = await (this.supabase.client as any)
          .from('project_tasks')
          .update(taskData)
          .eq('id', item.id);
        if (error) console.error('Error updating task:', item.id, error);
      } else {
        const { error } = await (this.supabase.client as any)
          .from('project_tasks')
          .insert(taskData);
        if (error) console.error('Error inserting task:', error);
      }
    }
  }

  // ==================== PROJECTS UPDATE (bypass updated_at) ====================

  /**
   * ✅ تحديث مباشر بدون updated_at — يتجاوز supabase.service الذي يضيفها تلقائياً
   * استخدم هذه الدالة بدلاً من base update() لجدول projects
   */
  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    // نحذف أي حقل updated_at إذا وصل بالخطأ
    const clean = { ...data } as any;
    delete clean.updated_at;
    delete clean.created_at;
    delete clean.id;

    return new Observable(observer => {
      (this.supabase.client as any)
        .from('projects')
        .update(clean as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()
        .then(({ data: updated, error }: any) => {
          if (error) {
            console.error('updateProject error:', error);
            observer.error(error);
          } else {
            observer.next(updated as Project);
            observer.complete();
          }
        });
    });
  }

  // ==================== PROJECTS ====================

  getProjectsWithRelations(): Observable<Project[]> {
    this.setLoading(true);
    return new Observable(observer => {
      (this.supabase.client as any)
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
      (this.supabase.client as any)
        .from(this.tableName)
        .select(`
          *,
          customer:customers(id, name, email, phone, country:countries(name)),
          tasks:project_tasks(
            id, title, status, priority, start_date, due_date,
            quantity, unit_price, description, task_type, assignee_id,
            assignee:profiles(id, full_name, avatar_url, role)
          ),
          milestones:project_milestones(id, title, amount, due_date, status, completed_at),
          invoices:invoices(id, invoice_number, amount_due, status),
          expenses:expenses(id, title, amount, expense_date, approved)
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
      (this.supabase.client as any)
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

  // ==================== MILESTONES ====================

  getProjectMilestones(projectId: string): Observable<ProjectMilestone[]> {
    return new Observable(observer => {
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
      (this.supabase.client as any)
        .from('project_milestones')
        .insert(payload)
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
      (this.supabase.client as any)
        .from('project_tasks')
        .select('status')
        .eq('project_id', projectId)
        .then(({ data, error }: any) => {
          if (error || !data?.length) { observer.next(0); observer.complete(); return; }
          const completed = data.filter((t: any) => t.status === 'completed').length;
          observer.next(Math.round((completed / data.length) * 100));
          observer.complete();
        });
    });
  }

  // ==================== FINANCIAL ====================

  calculateProjectCost(projectId: string): Observable<number> {
    return new Observable(observer => {
      (this.supabase.client as any)
        .from('expenses')
        .select('amount')
        .eq('project_id', projectId)
        .eq('approved', true)
        .then(({ data, error }: any) => {
          if (error) { observer.error(error); return; }
          const total = (data || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);
          observer.next(total); observer.complete();
        });
    });
  }

  calculateFreelancerCost(projectId: string): Observable<number> {
    return new Observable(observer => {
      (this.supabase.client as any)
        .from('project_tasks')
        .select('id')
        .eq('project_id', projectId)
        .then(({ data: tasks, error }: any) => {
          if (error || !tasks?.length) { observer.next(0); observer.complete(); return; }
          const taskIds = tasks.map((t: any) => t.id);
          (this.supabase.client as any)
            .from('freelancer_payments')
            .select('amount')
            .in('task_id', taskIds)
            .then(({ data: payments, error: pErr }: any) => {
              if (pErr) { observer.error(pErr); return; }
              const total = (payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
              observer.next(total); observer.complete();
            });
        });
    });
  }

  calculateProjectRevenue(projectId: string): Observable<number> {
    return new Observable(observer => {
      (this.supabase.client as any)
        .from('invoices')
        .select('amount_due')
        .eq('project_id', projectId)
        .then(({ data, error }: any) => {
          if (error) { observer.error(error); return; }
          const total = (data || []).reduce((s: number, i: any) => s + (i.amount_due || 0), 0);
          observer.next(total); observer.complete();
        });
    });
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
