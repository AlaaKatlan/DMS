import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { Project } from '../../../../core/models/base.model';

@Component({
  selector: 'app-project-timeline',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './project-timeline.component.html',
  styleUrls: ['./project-timeline.component.scss']
})
export class ProjectTimelineComponent implements OnInit {
  private projectsService = inject(ProjectsService);

  // Grouped projects: { 'January 2024': [Project, Project], ... }
  groupedProjects: { date: string, projects: Project[] }[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (projects) => {
        // ترتيب المشاريع حسب تاريخ البدء (الأحدث أولاً)
        const sorted = projects.sort((a, b) => {
          return new Date(b.start_date || b.created_at).getTime() - new Date(a.start_date || a.created_at).getTime();
        });

        this.groupProjectsByMonth(sorted);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error', err);
        this.loading = false;
      }
    });
  }

  groupProjectsByMonth(projects: Project[]): void {
    const groups: { [key: string]: Project[] } = {};

    projects.forEach(project => {
      const date = new Date(project.start_date || project.created_at);
      // تنسيق التاريخ: "يناير 2024"
      const key = date.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(project);
    });

    this.groupedProjects = Object.keys(groups).map(key => ({
      date: key,
      projects: groups[key]
    }));
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'active': return 'active';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'default';
    }
  }
}
