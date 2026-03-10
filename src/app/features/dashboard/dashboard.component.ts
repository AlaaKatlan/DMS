import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardService } from './dashboard.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { DashboardStats } from '../../core/models/base.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService      = inject(AuthService);
  private cd               = inject(ChangeDetectorRef);

  stats: DashboardStats | null = null;
  loading = true;
  currentUser: UserProfile | null = this.authService.currentUser;
  currentDate = new Date();

  revenueChartData: { name: string; value: number }[] = [];
  topBooks: { name: string; author?: string; value: number }[] = [];
  recentActivities: { title: string; description: string; type: string; time: string; amount?: number }[] = [];

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => { this.stats = data; this.loading = false; this.cd.detectChanges(); },
      error: () => { this.loading = false; this.cd.detectChanges(); }
    });

    this.dashboardService.getMonthlyRevenue().subscribe({
      next: (data) => { this.revenueChartData = data; this.cd.detectChanges(); }
    });
    this.dashboardService.getTopBooks().subscribe({
      next: (data) => { this.topBooks = data; this.cd.detectChanges(); }
    });
    this.dashboardService.getRecentActivities().subscribe({
      next: (data) => { this.recentActivities = data; this.cd.detectChanges(); }
    });
  }

  // ── Greeting ──────────────────────────────────
  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء الخير';
    return 'مساء النور';
  }

  // ── Number formatting ─────────────────────────
  formatNumber(value: number): string {
    if (!value && value !== 0) return '0';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'م';
    if (value >= 1_000)     return (value / 1_000).toFixed(0) + 'ك';
    return value.toLocaleString('en-US');
  }

  // ── Chart helpers ─────────────────────────────
  getMaxRevenue(): number {
    if (!this.revenueChartData.length) return 0;
    return Math.max(...this.revenueChartData.map(d => d.value));
  }

  getBarHeight(value: number): number {
    const max = this.getMaxRevenue();
    return max ? Math.max((value / max) * 100, 2) : 0;
  }

  // ── Donut chart ───────────────────────────────
  /** Returns stroke-dasharray profit arc for a circle with circumference `c` (default 289) */
  getProfitArc(c = 289): number {
    if (!this.stats?.monthlyRevenue) return 0;
    return Math.round((Math.max(this.stats.monthlyProfit, 0) / this.stats.monthlyRevenue) * c);
  }

  getExpenseArc(c = 289): number {
    if (!this.stats?.monthlyRevenue) return 0;
    return Math.round((Math.min(this.stats.monthlyExpenses, this.stats.monthlyRevenue) / this.stats.monthlyRevenue) * c);
  }

  getProfitMargin(): number {
    if (!this.stats?.monthlyRevenue) return 0;
    return Math.max(Math.round((this.stats.monthlyProfit / this.stats.monthlyRevenue) * 100), 0);
  }

  // ── Books helpers ─────────────────────────────
  getRankClass(i: number): string {
    return ['rank-gold', 'rank-silver', 'rank-bronze'][i] ?? 'rank-other';
  }

  getBookBarWidth(value: number, books: { value: number }[]): number {
    const max = Math.max(...books.map(b => b.value));
    return max ? Math.round((value / max) * 100) : 0;
  }

  // ── Misc ──────────────────────────────────────
  mathMin(a: number, b: number): number { return Math.min(a, b); }

  getTimeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'الآن';
    if (m < 60) return `منذ ${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} س`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `منذ ${d} يوم`;
    return new Date(dateString).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  }
}
