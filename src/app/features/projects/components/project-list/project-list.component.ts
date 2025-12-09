// src/app/features/projects/components/project-list/project-list.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  private cd = inject(ChangeDetectorRef);

  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = false;

  // Filters
  searchQuery = '';
  statusFilter: string = 'all'; // جعلناها string لتجنب خطأ القالب
  viewMode: 'list' | 'grid' = 'grid';

  // Pagination (الإضافة الجديدة لحل المشكلة)
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getProjectsWithRelations().subscribe({
      next: (data) => {
        this.projects = data;
        this.applyFilters();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.projects];

    // Search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.customer?.name?.toLowerCase().includes(query)
      );
    }

    // Status Filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }

    this.filteredProjects = filtered;

    // إعادة حساب الصفحات
    this.totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage) || 1;
    this.currentPage = 1;
  }

  // دالة لتعيين الفلتر وحل مشكلة الأنواع
  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  // --- Pagination Methods ---
  getPaginatedProjects(): Project[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredProjects.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  deleteProject(project: Project): void {
    if (confirm(`هل أنت متأكد من حذف مشروع: "${project.title}"؟`)) {
      this.projectsService.delete(project.id).subscribe({
        next: () => this.loadProjects(),
        error: () => alert('حدث خطأ أثناء الحذف')
      });
    }
  }

  // --- Helpers ---

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': 'نشط',
      'completed': 'مكتمل',
      'on_hold': 'معلق',
      'cancelled': 'ملغى'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'on_hold': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getProgress(project: any): number {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }
}
