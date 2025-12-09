// src/app/features/projects/components/project-detail/project-detail.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { Project, ProjectTask } from '../../../../core/models/base.model';
import { MilestonesComponent } from '../milestones/milestones.component';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule,MilestonesComponent],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef); // 1. حقن خدمة ChangeDetectorRef

  project: Project | null = null;
  projectStats: any = null;
  loading = true;
  activeTab: 'overview' | 'tasks' | 'milestones' | 'invoices' | 'expenses' | 'files' = 'overview';

  projectId: string | null = null;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProject(this.projectId);
      this.loadStats(this.projectId);
    } else {
      this.router.navigate(['/projects']);
    }
  }

  loadProject(id: string): void {
    this.loading = true;
    this.projectsService.getProjectDetail(id).subscribe({
      next: (data) => {
        // 2. استخدام setTimeout لحل مشكلة NG0100 (تأخير التحديث للدورة القادمة)
        setTimeout(() => {
          this.project = data;
          this.loading = false;
          this.cd.detectChanges(); // 3. إجبار تحديث الواجهة لإخفاء السبينر
        }, 0);
      },
      error: (error) => {
        console.error('Error loading project:', error);
        alert('حدث خطأ أثناء تحميل بيانات المشروع');
        this.router.navigate(['/projects']);
        this.loading = false;
        this.cd.detectChanges();
      }
    });
  }

  loadStats(id: string): void {
    this.projectsService.getProjectStats(id).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.projectStats = data;
          this.cd.detectChanges(); // تحديث الأرقام فور وصولها
        }, 0);
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  editProject(): void {
    if (this.projectId) {
      this.router.navigate(['/projects', this.projectId, 'edit']);
    }
  }

  deleteProject(): void {
    if (!this.project) return;

    if (confirm(`هل أنت متأكد من حذف المشروع: ${this.project.title}؟`)) {
      this.projectsService.delete(this.project.id).subscribe({
        next: () => {
          alert('تم حذف المشروع بنجاح');
          this.router.navigate(['/projects']);
        },
        error: (error) => {
          console.error('Error deleting project:', error);
          alert('حدث خطأ أثناء حذف المشروع');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  calculateProgress(): number {
    if (!this.project?.tasks || this.project.tasks.length === 0) return 0;
    const completed = this.project.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / this.project.tasks.length) * 100);
  }

  getTasksByStatus(status: string): ProjectTask[] {
    if (!this.project?.tasks) return [];
    return this.project.tasks.filter(t => t.status === status);
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

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'active': 'success',
      'completed': 'info',
      'cancelled': 'danger',
      'on_hold': 'warning',
      'todo': 'default',
      'in_progress': 'info',
      'blocked': 'warning',
      'paid': 'success',
      'unpaid': 'warning',
      'partially_paid': 'info'
    };
    return colors[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': 'نشط',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'on_hold': 'متوقف',
      'todo': 'معلق',
      'in_progress': 'قيد التنفيذ',
      'blocked': 'محظور',
      'paid': 'مدفوع',
      'unpaid': 'غير مدفوع',
      'partially_paid': 'مدفوع جزئياً',
      'pending': 'معلق'
    };
    return labels[status] || status;
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': 'info',
      'medium': 'warning',
      'high': 'danger',
      'urgent': 'danger'
    };
    return colors[priority] || 'default';
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

  isOverdue(): boolean {
    if (!this.project?.due_date || this.project.status !== 'active') return false;
    const today = new Date().toISOString().split('T')[0];
    return this.project.due_date < today;
  }
}
