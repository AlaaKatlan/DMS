import { Component, Input, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectsService } from '../../projects.service';
import { ProjectMilestone } from '../../../../core/models/base.model';

@Component({
  selector: 'app-milestones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './milestones.component.html',
  styleUrls: ['./milestones.component.scss']
})
export class MilestonesComponent implements OnInit {
  @Input() projectId!: string;
  private projectsService = inject(ProjectsService);

  milestones: ProjectMilestone[] = [];
  loading = false;

  // لنموذج الإضافة السريع
  isAdding = false;
  newMilestoneTitle = '';
  newMilestoneDate = '';
  newMilestoneAmount = 0;

  ngOnInit(): void {
   if (this.projectId) {
      this.loadMilestones();
    }
  }
// أضف هذه الدالة
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && changes['projectId'].currentValue) {
      this.loadMilestones();
    }
  }
loadMilestones(): void {
    if (!this.projectId) return; // حماية إضافية
    this.loading = true;
    this.projectsService.getProjectMilestones(this.projectId).subscribe({
      next: (data) => {
        this.milestones = data;
        this.loading = false;
       },
      error: () => this.loading = false
    });
  }

  toggleStatus(milestone: ProjectMilestone): void {
    if (milestone.status === 'completed') return; // لا نعدل المكتمل حالياً

    if (confirm('هل تريد تأكيد إتمام هذه المحطة؟')) {
      this.projectsService.completeMilestone(milestone.id).subscribe({
        next: (updated) => {
          milestone.status = 'completed';
          milestone.completed_at = updated.completed_at;
        }
      });
    }
  }

  deleteMilestone(id: string): void {
    if (confirm('هل أنت متأكد من الحذف؟')) {
      this.projectsService.deleteMilestone(id).subscribe({
        next: () => {
          this.milestones = this.milestones.filter(m => m.id !== id);
        }
      });
    }
  }

  saveNewMilestone(): void {
    if (!this.newMilestoneTitle) return;

    this.projectsService.createMilestone({
      project_id: this.projectId,
      title: this.newMilestoneTitle,
      due_date: this.newMilestoneDate || undefined,
      amount: this.newMilestoneAmount || 0,
      status: 'pending'
    }).subscribe({
      next: (newItem) => {
        this.milestones.push(newItem);
        // إعادة تعيين النموذج
        this.newMilestoneTitle = '';
        this.newMilestoneDate = '';
        this.newMilestoneAmount = 0;
        this.isAdding = false;
      },
      error: (err) => alert('حدث خطأ أثناء الإضافة')
    });
  }

  formatCurrency(amount: number): string {
    return amount ? `$${amount.toLocaleString()}` : '-';
  }
}
