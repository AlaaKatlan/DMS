// src/app/features/tasks/components/task-form/task-form.component.ts
import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TasksService } from '../../tasks.service';
import { ProjectsService } from '../../../projects/projects.service';
import { SettingsService } from '../../../settings/settings.service';
import { Project, TaskStatus, TaskPriority } from '../../../../core/models/base.model';
import { Subscription } from 'rxjs'; // 1. استيراد Subscription

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private tasksService = inject(TasksService);
  private projectsService = inject(ProjectsService);
  private settingsService = inject(SettingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  taskForm!: FormGroup;
  isEditMode = false;
  taskId: string | null = null;
  loading = false;
  submitting = false;

  private routeSub: Subscription | null = null; // 2. متغير للاشتراك

  // القوائم
  projects: Project[] = [];
  users: any[] = [];

  statuses: TaskStatus[] = ['todo', 'in_progress', 'completed', 'blocked', 'cancelled'];
  priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

  ngOnInit(): void {
    this.initForm();
    this.loadData();

    // 3. التغيير الجذري: استخدام subscribe بدلاً من snapshot
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.taskId = params.get('id');

      if (this.taskId) {
        this.isEditMode = true;
        this.loadTask(this.taskId);
      } else {
        this.isEditMode = false;
        this.taskForm.reset({
            status: 'todo',
            priority: 'medium',
            quantity: 1,
            task_type: 'parallel'
        });
      }
    });
  }

  ngOnDestroy(): void {
    // 4. إلغاء الاشتراك عند الخروج
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  initForm(): void {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      project_id: ['', [Validators.required]],
      assignee_id: [null],
      description: [''],
      status: ['todo', Validators.required],
      priority: ['medium', Validators.required],
      task_type: ['parallel'],
      start_date: [null],
      due_date: [null],
      quantity: [1, [Validators.min(0)]],
      unit_price: [0, [Validators.min(0)]]
    });
  }

  loadData(): void {
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (data) => {
        this.projects = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Error loading projects', err)
    });

    this.settingsService.getUsersList().subscribe({
      next: (data) => {
        this.users = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Error loading users', err)
    });
  }

  loadTask(id: string): void {
    this.loading = true;
    this.tasksService.getTaskDetail(id).subscribe({
      next: (task) => {
        if (task) {
          this.taskForm.patchValue({
            title: task.title,
            project_id: task.project_id,
            assignee_id: task.assignee_id,
            description: task.description,
            status: task.status,
            priority: task.priority,
            task_type: task.task_type,
            start_date: task.start_date,
            due_date: task.due_date,
            quantity: task.quantity || 1,
            unit_price: task.unit_price || 0
          });
        }
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        alert('فشل تحميل بيانات المهمة');
        this.router.navigate(['/tasks']);
      }
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const taskData = this.taskForm.value;

    const request$ = this.isEditMode && this.taskId
      ? this.tasksService.update(this.taskId, taskData)
      : this.tasksService.create(taskData);

    request$.subscribe({
      next: () => {
        alert(this.isEditMode ? 'تم تحديث المهمة بنجاح' : 'تم إضافة المهمة بنجاح');
        this.router.navigate(['/tasks/board']);
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
        this.submitting = false;
        this.cd.detectChanges();
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'قيد الانتظار',
      'in_progress': 'جاري العمل',
      'completed': 'مكتملة',
      'blocked': 'محظورة',
      'cancelled': 'ملغاة'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'منخفضة',
      'medium': 'متوسطة',
      'high': 'عالية',
      'urgent': 'عاجلة'
    };
    return labels[priority] || priority;
  }
}
