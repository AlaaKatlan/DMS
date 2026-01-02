import { Component, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { ProjectMilestone } from '../../../../core/models/base.model';

@Component({
  selector: 'app-milestones',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './milestones.component.html',
  styleUrls: ['./milestones.component.scss']
})
export class MilestonesComponent {
  private projectsService = inject(ProjectsService);
  private cdr = inject(ChangeDetectorRef);

  milestones: ProjectMilestone[] = [];
  loading = false;

  // ✅ تعريف المتغيرات الناقصة
  isAdding = false;
  newMilestoneTitle = '';
  newMilestoneDate = '';
  newMilestoneAmount: number | null = null;

  private _projectId: string | null = null;

  @Input()
  set projectId(value: string | undefined | null) {
    if (value) {
      this._projectId = value;
      this.loadMilestones();
    }
  }

  get projectId(): string | null {
    return this._projectId;
  }

  loadMilestones(): void {
    if (!this._projectId) return;

    this.loading = true;
    this.projectsService.getProjectMilestones(this._projectId).subscribe({
      next: (data) => {
        this.milestones = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading milestones:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ تعريف دالة الحفظ
  saveNewMilestone(): void {
    if (!this.newMilestoneTitle || !this._projectId) return;

    const newMilestone = {
      project_id: this._projectId,
      title: this.newMilestoneTitle,
      due_date: this.newMilestoneDate || undefined,
      amount: this.newMilestoneAmount || 0,
      status: 'pending' as const
    };

    this.projectsService.createMilestone(newMilestone).subscribe({
      next: (ms) => {
        this.milestones.push(ms);
        // إعادة تعيين النموذج
        this.isAdding = false;
        this.newMilestoneTitle = '';
        this.newMilestoneDate = '';
        this.newMilestoneAmount = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating milestone:', err);
        alert('حدث خطأ أثناء حفظ المحطة');
      }
    });
  }

  deleteMilestone(id: string): void {
    if (!confirm('هل أنت متأكد من حذف هذه المحطة؟')) return;

    this.projectsService.deleteMilestone(id).subscribe({
      next: () => {
        this.milestones = this.milestones.filter(m => m.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Delete error:', err)
    });
  }

  toggleStatus(milestone: ProjectMilestone): void {
    const newStatus = milestone.status === 'pending' ? 'completed' : 'pending';
    const oldStatus = milestone.status;

    milestone.status = newStatus;

    this.projectsService.updateMilestone(milestone.id, { status: newStatus }).subscribe({
      error: () => {
        milestone.status = oldStatus;
        alert('حدث خطأ أثناء تحديث الحالة');
        this.cdr.detectChanges();
      }
    });
  }

  // ✅ تعريف دالة تنسيق العملة
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
}
