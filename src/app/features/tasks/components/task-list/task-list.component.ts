import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TasksService } from '../../tasks.service';
import { ProjectTask } from '../../../../core/models/base.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent implements OnInit {
  private tasksService = inject(TasksService);
  private cd = inject(ChangeDetectorRef);

  tasks: ProjectTask[] = [];
  filteredTasks: ProjectTask[] = [];
  loading = false;

  // Filters
  searchQuery = '';
  statusFilter = 'all';
  viewMode: 'list' | 'grid' = 'list';

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.tasksService.getTasksWithRelations().subscribe({
      next: (data: ProjectTask[]) => {
        this.tasks = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading tasks:', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tasks];

    // 1. Text Search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.project?.title?.toLowerCase().includes(query)
      );
    }

    // 2. Status Filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === this.statusFilter);
    }

    this.filteredTasks = filtered;
  }

  deleteTask(task: ProjectTask): void {
    if (confirm(`Are you sure you want to delete task: "${task.title}"?`)) {
      this.tasksService.delete(task.id).subscribe({
        next: () => {
          this.loadTasks();
        },
        error: (err) => alert('Error deleting task')
      });
    }
  }

  // --- UI Helpers ---

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'review': 'Review',
      'completed': 'Completed',
      'blocked': 'Blocked',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'review': return 'bg-purple-100 text-purple-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getPriorityColor(priority?: string): string {
    switch (priority) {
      case 'high': return '#EF4444'; // Red
      case 'medium': return '#F59E0B'; // Orange
      case 'low': return '#10B981'; // Green
      default: return '#9CA3AF'; // Gray
    }
  }

  getPriorityLabel(priority?: string): string {
    const labels: Record<string, string> = {
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return labels[priority || ''] || 'Normal';
  }
}
