import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProjectTask } from '../../../../core/models/base.model';

@Component({
  selector: 'app-dependency-graph',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './dependency-graph.component.html',
  styleUrls: ['./dependency-graph.component.scss']
})
export class DependencyGraphComponent {
  @Input() currentTask!: ProjectTask;
  @Input() dependencies: ProjectTask[] = []; // المهام التي تعتمد عليها (Parents)
  @Input() dependents: ProjectTask[] = [];   // المهام التي تنتظر هذه المهمة (Children)

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  }
}
