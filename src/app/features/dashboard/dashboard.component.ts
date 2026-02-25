// src/app/features/dashboard/dashboard.component.ts
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
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    // NgxChartsModule (إذا كنت تستخدم مكتبة رسوم بيانية)
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  stats: DashboardStats | null = null;
  loading = true;
  currentUser: UserProfile | null = this.authService.currentUser;

  revenueChartData: any[] = [];
  topBooks: any[] = [];
  recentActivities: any[] = [];

  ngOnInit(): void {
    // التأكد من وجود مستخدم قبل التحميل
    this.currentUser = this.authService.currentUser;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // 1. جلب الإحصائيات الرئيسية
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        console.log('Dashboard Stats:', data);
        this.stats = data;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.loading = false;
        this.cd.detectChanges();
      }
    });

    // 2. جلب باقي البيانات بالتوازي
    this.loadRevenueChart();
    this.loadTopBooks();
    this.loadRecentActivities();
  }

  loadRevenueChart(): void {
    this.dashboardService.getMonthlyRevenue().subscribe({
      next: (data) => {
        this.revenueChartData = data;
        this.cd.detectChanges();
      }
    });
  }

  loadTopBooks(): void {
    this.dashboardService.getTopBooks().subscribe({
      next: (data) => {
        this.topBooks = data;
        this.cd.detectChanges();
      }
    });
  }

  loadRecentActivities(): void {
    this.dashboardService.getRecentActivities().subscribe({
      next: (data) => {
        this.recentActivities = data;
        this.cd.detectChanges();
      }
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  }

  // دالة مساعدة لتنسيق الوقت النسبي
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;

    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  }
}
