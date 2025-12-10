// src/app/features/tasks/components/task-board/task-board.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { TasksService } from '../../tasks.service';
import { ProjectTask, TaskStatus } from '../../../../core/models/base.model';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule, LucideAngularModule],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit {
  private tasksService = inject(TasksService);
  private cd = inject(ChangeDetectorRef);

  // قوائم المهام حسب الحالة
  todoTasks: ProjectTask[] = [];
  inProgressTasks: ProjectTask[] = [];
  reviewTasks: ProjectTask[] = [];
  completedTasks: ProjectTask[] = [];

  loading = true;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.tasksService.getTasksWithRelations().subscribe({
      next: (tasks) => {
        this.distributeTasks(tasks);
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.loading = false;
      }
    });
  }

  distributeTasks(tasks: ProjectTask[]): void {
    // تصفير القوائم
    this.todoTasks = [];
    this.inProgressTasks = [];
    this.reviewTasks = [];
    this.completedTasks = [];

    tasks.forEach(task => {
      switch (task.status) {
        case 'todo':
        case 'blocked': // نضع المحظورة مع قائمة الانتظار مبدئياً
          this.todoTasks.push(task);
          break;
        case 'in_progress':
          this.inProgressTasks.push(task);
          break;
        case 'completed':
          this.completedTasks.push(task);
          break;
        default:
          // إذا كانت هناك حالات أخرى مثل review نضعها هنا أو في قائمة الانتظار
           this.inProgressTasks.push(task);
      }
    });
  }

  drop(event: CdkDragDrop<ProjectTask[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      // إعادة ترتيب في نفس العمود
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // نقل لعمود آخر
      const task = event.previousContainer.data[event.previousIndex];

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // تحديث الحالة في قاعدة البيانات
      this.updateTaskStatus(task.id, newStatus);
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.tasksService.updateTaskStatus(taskId, status).subscribe({
      error: (err) => {
        console.error('Failed to update status', err);
        alert('فشل تحديث حالة المهمة');
        this.loadTasks(); // تراجع عن التغيير في حال الخطأ
      }
    });
  }

  getPriorityClass(priority: string | undefined): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      case 'urgent': return 'priority-urgent';
      default: return 'priority-medium';
    }
  }
}
