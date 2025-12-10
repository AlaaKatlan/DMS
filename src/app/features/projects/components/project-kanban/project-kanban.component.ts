// src/app/features/projects/components/project-kanban/project-kanban.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { Project, ProjectStatus } from '../../../../core/models/base.model';

@Component({
  selector: 'app-project-kanban',
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule, LucideAngularModule],
  templateUrl: './project-kanban.component.html',
  styleUrls: ['./project-kanban.component.scss']
})
export class ProjectKanbanComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private cd = inject(ChangeDetectorRef); // 1. حقن خدمة التحديث

  todoProjects: Project[] = [];
  activeProjects: Project[] = [];
  completedProjects: Project[] = [];
  cancelledProjects: Project[] = [];

  loading = true;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (projects) => {
        // 2. تأخير بسيط وتحديث يدوي
        setTimeout(() => {
          this.distributeProjects(projects);
          this.loading = false;
          this.cd.detectChanges();
        }, 0);
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  distributeProjects(projects: Project[]): void {
    this.activeProjects = [];
    this.completedProjects = [];
    this.cancelledProjects = [];
    this.todoProjects = [];

    projects.forEach(project => {
      switch (project.status) {
        case 'active': this.activeProjects.push(project); break;
        case 'completed': this.completedProjects.push(project); break;
        case 'cancelled': this.cancelledProjects.push(project); break;
        case 'on_hold': this.todoProjects.push(project); break;
        default: this.activeProjects.push(project);
      }
    });
  }

  drop(event: CdkDragDrop<Project[]>, newStatus: string): void { // استخدام string مؤقتاً لتسهيل التحويل
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const project = event.container.data[event.currentIndex];
      // تحويل النص إلى ProjectStatus بأمان
      const status = newStatus as ProjectStatus;
      this.updateStatus(project.id, status);
    }
  }

  updateStatus(projectId: string, status: ProjectStatus): void {
    this.projectsService.updateProjectStatus(projectId, status).subscribe({
      error: (err) => {
        alert('فشل تحديث حالة المشروع');
        this.loadProjects();
      }
    });
  }

  getProgress(project: any): number {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completed = project.tasks.filter((t: any) => t.status === 'completed').length;
    return Math.round((completed / project.tasks.length) * 100);
  }

  formatCurrency(amount: number | undefined, currency: string = 'USD'): string {
    return `${amount || 0} ${currency}`;
  }
}
