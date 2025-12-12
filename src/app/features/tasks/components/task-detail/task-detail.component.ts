import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TasksService } from '../../tasks.service';
import { ProjectTask } from '../../../../core/models/base.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss']
})
export class TaskDetailComponent implements OnInit {
  private tasksService = inject(TasksService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  task: ProjectTask | null = null;
  loading = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTask(id);
    } else {
      this.router.navigate(['/tasks']);
    }
  }

  loadTask(id: string): void {
    this.loading = true;
    this.tasksService.getTaskDetail(id).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.task = data;
          this.loading = false;
          this.cd.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading task:', err);
        this.loading = false;
        this.router.navigate(['/tasks']);
      }
    });
  }

  deleteTask(): void {
    if (!this.task) return;
    if (confirm(`هل أنت متأكد من حذف المهمة: "${this.task.title}"؟`)) {
      this.tasksService.delete(this.task.id).subscribe({
        next: () => {
          alert('تم الحذف بنجاح');
          this.router.navigate(['/tasks']);
        },
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  // Helpers for UI
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

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'todo': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'completed': 'bg-green-100 text-green-700',
      'blocked': 'bg-red-100 text-red-700',
      'cancelled': 'bg-red-50 text-red-600'
    };
    return classes[status] || 'bg-gray-100';
  }

  getPriorityLabel(priority: string | undefined): string {
    const labels: Record<string, string> = {
      'low': 'منخفضة',
      'medium': 'متوسطة',
      'high': 'عالية',
      'urgent': 'عاجلة'
    };
    return labels[priority || 'medium'] || 'متوسطة';
  }

  getPriorityClass(priority: string | undefined): string {
    const classes: Record<string, string> = {
      'low': 'text-gray-600 bg-gray-50',
      'medium': 'text-yellow-700 bg-yellow-50',
      'high': 'text-orange-700 bg-orange-50',
      'urgent': 'text-red-700 bg-red-50'
    };
    return classes[priority || 'medium'] || classes['medium'];
  }
}
