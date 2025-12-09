import { Component, OnInit, inject } from '@angular/core';
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

  // تعريف الأعمدة
  todoProjects: Project[] = [];      // On Hold / Todo logic based on your business
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
        this.distributeProjects(projects);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.loading = false;
      }
    });
  }

  distributeProjects(projects: Project[]): void {
    // تصفير القوائم
    this.activeProjects = [];
    this.completedProjects = [];
    this.cancelledProjects = [];
    this.todoProjects = []; // سنستخدم on_hold لهذا العمود

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

  drop(event: CdkDragDrop<Project[]>, newStatus: ProjectStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // نقل العنصر في الواجهة فوراً
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // تحديث الحالة في قاعدة البيانات
      const project = event.container.data[event.currentIndex];
      this.updateStatus(project.id, newStatus);
    }
  }

  updateStatus(projectId: string, status: ProjectStatus): void {
    this.projectsService.updateProjectStatus(projectId, status).subscribe({
      error: (err) => {
        alert('فشل تحديث حالة المشروع');
        this.loadProjects(); // إعادة تحميل لإلغاء التغيير في حال الفشل
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
