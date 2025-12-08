// src/app/features/projects/components/project-list/project-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { Project, ProjectStatus } from '../../../../core/models/base.model';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private router = inject(Router);

  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = false;
  searchQuery = '';
  selectedStatus: ProjectStatus | '' = '';
  selectedCustomer = '';
  viewMode: 'grid' | 'kanban' | 'timeline' = 'grid';

  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;

  // Stats
  stats = {
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0
  };

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (data) => {
        this.projects = data;
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats.total = this.projects.length;
    this.stats.active = this.projects.filter(p => p.status === 'active').length;
    this.stats.completed = this.projects.filter(p => p.status === 'completed').length;
    this.stats.cancelled = this.projects.filter(p => p.status === 'cancelled').length;

    const today = new Date().toISOString().split('T')[0];
    this.stats.overdue = this.projects.filter(p =>
      p.status === 'active' && p.due_date && p.due_date < today
    ).length;
  }

  applyFilters(): void {
    let filtered = [...this.projects];

    // Search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.customer?.name.toLowerCase().includes(query) ||
        p.project_type?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (this.selectedStatus) {
      filtered = filtered.filter(p => p.status === this.selectedStatus);
    }

    // Filter by customer
    if (this.selectedCustomer) {
      filtered = filtered.filter(p => p.customer?.name === this.selectedCustomer);
    }

    this.filteredProjects = filtered;
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
    this.currentPage = 1;
  }

  getPaginatedProjects(): Project[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredProjects.slice(start, end);
  }

  getProjectsByStatus(status: ProjectStatus): Project[] {
    return this.filteredProjects.filter(p => p.status === status);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  setViewMode(mode: typeof this.viewMode): void {
    this.viewMode = mode;
  }

  viewProject(id: string): void {
    this.router.navigate(['/projects', id]);
  }

  editProject(id: string): void {
    this.router.navigate(['/projects', id, 'edit']);
  }

  deleteProject(project: Project): void {
    if (confirm(`هل أنت متأكد من حذف المشروع: ${project.title}؟`)) {
      this.projectsService.delete(project.id).subscribe({
        next: () => {
          this.loadProjects();
        },
        error: (error) => {
          console.error('Error deleting project:', error);
          alert('حدث خطأ أثناء حذف المشروع');
        }
      });
    }
  }

  getUniqueCustomers(): string[] {
    return [...new Set(this.projects.map(p => p.customer?.name).filter(Boolean) as string[])];
  }

  getStatusColor(status: ProjectStatus): string {
    const colors: Record<ProjectStatus, string> = {
      'active': 'success',
      'completed': 'info',
      'cancelled': 'danger',
      'on_hold': 'warning'
    };
    return colors[status];
  }

  getStatusLabel(status: ProjectStatus): string {
    const labels: Record<ProjectStatus, string> = {
      'active': 'نشط',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'on_hold': 'متوقف'
    };
    return labels[status];
  }

  calculateProgress(project: Project): number {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completed = project.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / project.tasks.length) * 100);
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    const symbols: Record<string, string> = {
      USD: '$',
      AED: 'د.إ',
      QR: 'ر.ق',
      SYP: 'ل.س'
    };
    return `${symbols[currency] || ''} ${amount.toLocaleString('ar-SA')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ar-SA');
  }

  isOverdue(project: Project): boolean {
    if (!project.due_date || project.status !== 'active') return false;
    const today = new Date().toISOString().split('T')[0];
    return project.due_date < today;
  }
}
