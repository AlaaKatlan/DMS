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
  private cd = inject(ChangeDetectorRef); // 1. حقن خدمة التحديث

  // قوائم المهام
  todoTasks: ProjectTask[] = [];
  inProgressTasks: ProjectTask[] = [];
  completedTasks: ProjectTask[] = [];

  loading = true;

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.tasksService.getTasksWithRelations().subscribe({
      next: (tasks) => {
        // 2. الحل السحري: استخدام setTimeout مع detectChanges
        setTimeout(() => {
          this.distributeTasks(tasks);
          this.loading = false;
          this.cd.detectChanges(); // تحديث الواجهة يدوياً
        }, 0);
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  distributeTasks(tasks: ProjectTask[]): void {
    this.todoTasks = [];
    this.inProgressTasks = [];
    this.completedTasks = [];

    tasks.forEach(task => {
      switch (task.status) {
        case 'todo':
        case 'blocked':
          this.todoTasks.push(task);
          break;
        case 'in_progress':
          this.inProgressTasks.push(task);
          break;
        case 'completed':
          this.completedTasks.push(task);
          break;
        default:
          this.todoTasks.push(task);
      }
    });
  }

  drop(event: CdkDragDrop<ProjectTask[]>, newStatusStr: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      const newStatus = newStatusStr as TaskStatus;

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      this.updateTaskStatus(task.id, newStatus);
    }
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.tasksService.updateTaskStatus(taskId, status).subscribe({
      error: (err) => {
        alert('فشل تحديث الحالة');
        this.loadTasks(); // تراجع
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
