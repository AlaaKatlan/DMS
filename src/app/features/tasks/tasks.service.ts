// src/app/features/tasks/tasks.service.ts
import { Injectable } from '@angular/core';
import { Observable, map, forkJoin } from 'rxjs';
import { BaseService } from '../../core/services/base.service';
import {
  ProjectTask,
  TaskDependency,
  TaskStatus,
  TaskPriority,
  UserProfile
} from '../../core/models/base.model';

@Injectable({
  providedIn: 'root'
})
export class TasksService extends BaseService<ProjectTask> {
  protected override tableName = 'project_tasks';

  protected override getSearchColumns(): string[] {
    return ['title', 'description'];
  }

  // ==================== TASKS ====================

  /**
   * Get tasks with full relations
   */
  getTasksWithRelations(): Observable<ProjectTask[]> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          project:projects(id, title, customer_id),
          assignee:profiles(id, full_name, avatar_url, role)
        `)
        .order('created_at', { ascending: false })
        .then(({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            this.items$.next(data as ProjectTask[]);
            this.clearError();
            observer.next(data as ProjectTask[]);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }
/**
   * Get task detail with dependencies
   */
  getTaskDetail(taskId: string): Observable<ProjectTask | null> {
    this.setLoading(true);

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        // 👇 الكود المصحح: إزالة التعليقات والأسطر الزائدة داخل الـ select
        .select(`
          *,
          project:projects(id, title, status),
          assignee:profiles(id, full_name, avatar_url, role)
        `)
        .eq('id', taskId)
        .single()
        .then(async ({ data, error }: any) => {
          if (error) {
            this.setError(error.message);
            observer.error(error);
          } else {
            const task = data as ProjectTask;

            // Get dependencies
            const deps = await this.getTaskDependencies(taskId).toPromise();
            task.dependencies = deps || [];

            // Get dependent tasks
            const dependents = await this.getDependentTasks(taskId).toPromise();
            task.dependent_tasks = dependents || [];

            this.clearError();
            observer.next(task);
            observer.complete();
          }

          this.setLoading(false);
        });
    });
  }

  /**
   * Get tasks by project
   */
  getProjectTasks(projectId: string): Observable<ProjectTask[]> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          assignee:profiles(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as ProjectTask[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get tasks by assignee
   */
  getAssigneeTasks(assigneeId: string): Observable<ProjectTask[]> {
    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          project:projects(id, title, customer:customers(name))
        `)
        .eq('assignee_id', assigneeId)
        .order('due_date', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as ProjectTask[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Observable<ProjectTask[]> {
    return this.getFiltered({
      column: 'status',
      value: status
    });
  }

  /**
   * Get overdue tasks
   */
  getOverdueTasks(): Observable<ProjectTask[]> {
    const today = new Date().toISOString().split('T')[0];

    return new Observable(observer => {
      this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          project:projects(id, title),
          assignee:profiles(id, full_name)
        `)
        .in('status', ['todo', 'in_progress'])
        .lt('due_date', today)
        .order('due_date', { ascending: true })
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            observer.next(data as ProjectTask[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Update task status
   */
updateTaskStatus(taskId: string, status: TaskStatus): Observable<ProjectTask> {
  const updates: Record<string, any> = { status };

  if (status === 'completed') {
    updates['completed_at'] = new Date().toISOString(); // 👈 استخدمنا bracket
  }

  return this.update(taskId, updates);
}

  // ==================== DEPENDENCIES ====================

  /**
   * Get task dependencies (tasks that must be completed first)
   */
  getTaskDependencies(taskId: string): Observable<ProjectTask[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('task_dependencies')
        .select(`
          depends_on_task_id,
          task:project_tasks!depends_on_task_id(
            id,
            title,
            status,
            assignee:profiles(full_name)
          )
        `)
        .eq('task_id', taskId)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const tasks = (data || []).map((d: any) => d.task);
            observer.next(tasks as ProjectTask[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Get dependent tasks (tasks waiting for this task)
   */
  getDependentTasks(taskId: string): Observable<ProjectTask[]> {
    return new Observable(observer => {
      this.supabase.client
        .from('task_dependencies')
        .select(`
          task_id,
          task:project_tasks!task_id(
            id,
            title,
            status,
            assignee:profiles(full_name)
          )
        `)
        .eq('depends_on_task_id', taskId)
        .then(({ data, error }: any) => {
          if (error) {
            observer.error(error);
          } else {
            const tasks = (data || []).map((d: any) => d.task);
            observer.next(tasks as ProjectTask[]);
            observer.complete();
          }
        });
    });
  }

  /**
   * Add task dependency
   */
 addTaskDependency(taskId: string, dependsOnTaskId: string): Observable<TaskDependency> {
  return new Observable(observer => {
    const payload: Record<string, any> = {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId
    };

    this.supabase.client
      .from('task_dependencies')
      .insert(payload as never)  // ← إضافة as never هنا
      .then(({ error }: any) => {
        if (error) {
          observer.error(error);
        } else {
          observer.next({ task_id: taskId, depends_on_task_id: dependsOnTaskId });
          observer.complete();
        }
      });
  });
}

  /**
   * Remove task dependency
   */
  removeTaskDependency(taskId: string, dependsOnTaskId: string): Observable<void> {
    return new Observable(observer => {
      this.supabase.client
        .from('task_dependencies')
        .delete()
        .eq('task_id', taskId)
        .eq('depends_on_task_id', dependsOnTaskId)
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

  /**
   * Check if task can start (all dependencies completed)
   */
  canTaskStart(taskId: string): Observable<boolean> {
    return this.getTaskDependencies(taskId).pipe(
      map((dependencies: ProjectTask[]) => {
        return dependencies.every(dep => dep.status === 'completed');
      })
    );
  }

  /**
   * Get blocked tasks (serial tasks with incomplete dependencies)
   */
  getBlockedTasks(projectId?: string): Observable<ProjectTask[]> {
    return new Observable(observer => {
      let query = this.supabase.client
        .from(this.tableName)
        .select(`
          *,
          project:projects(id, title),
          assignee:profiles(id, full_name)
        `)
        .eq('task_type', 'serial')
        .in('status', ['todo', 'blocked']);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      query.then(async ({ data, error }: any) => {
        if (error) {
          observer.error(error);
        } else {
          const tasks = data as ProjectTask[];
          const blockedTasks: ProjectTask[] = [];

          for (const task of tasks) {
            const canStart = await this.canTaskStart(task.id).toPromise();
            if (!canStart) {
              blockedTasks.push(task);
            }
          }

          observer.next(blockedTasks);
          observer.complete();
        }
      });
    });
  }

  // ==================== ASSIGNMENT ====================

  /**
   * Assign task to user
   */
  assignTask(taskId: string, assigneeId: string): Observable<ProjectTask> {
    return this.update(taskId, { assignee_id: assigneeId });
  }

  /**
   * Unassign task
   */
unassignTask(taskId: string): Observable<ProjectTask> {
  return this.update(taskId, { assignee_id: null } as never);
}

  // ==================== STATISTICS ====================

  /**
   * Get task statistics for user
   */
  getUserTaskStats(userId: string): Observable<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    return this.supabase.rpc('get_user_task_stats', { user_id: userId });
  }

  /**
   * Get project task statistics
   */
  getProjectTaskStats(projectId: string): Observable<{
    total: number;
    completed: number;
    pending: number;
    blocked: number;
    progressPercentage: number;
  }> {
    return this.supabase.rpc('get_project_task_stats', { project_id: projectId });
  }

  // ==================== VALIDATION ====================

  /**
   * Detect circular dependencies
   */
  async hasCircularDependency(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    // Check if adding this dependency would create a cycle
    const visited = new Set<string>();
    const stack = [dependsOnTaskId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;

      if (currentId === taskId) {
        return true; // Circular dependency detected
      }

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const deps = await this.getTaskDependencies(currentId).toPromise();
      if (deps) {
        stack.push(...deps.map(d => d.id));
      }
    }

    return false;
  }

  // ==================== EXPORT ====================

  /**
   * Get tasks for export
   */
  getTasksForExport(projectId?: string): Observable<any[]> {
    const tasks$ = projectId
      ? this.getProjectTasks(projectId)
      : this.getTasksWithRelations();

    return tasks$.pipe(
      map((tasks: ProjectTask[]) =>
        tasks.map(t => ({
          'العنوان': t.title,
          'المشروع': t.project?.title || '-',
          'المعين': t.assignee?.full_name || '-',
          'النوع': t.task_type === 'serial' ? 'متسلسلة' : 'متوازية',
          'الحالة': t.status,
          'الأولوية': t.priority || '-',
          'تاريخ البدء': t.start_date || '-',
          'تاريخ التسليم': t.due_date || '-',
          'السعر': t.unit_price ? t.unit_price * (t.quantity || 1) : 0,
          'تاريخ الإنشاء': new Date(t.created_at).toLocaleDateString('ar-SA')
        }))
      )
    );
  }
}
