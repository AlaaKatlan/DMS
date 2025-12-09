// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. استيراد ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService } from './dashboard.service';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { DashboardStats } from '../../core/models/base.model';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef); // 2. حقن الخدمة

  stats: DashboardStats | null = null;
  loading = true;
  currentUser: UserProfile | null = this.authService.currentUser;

  revenueChartData: any[] = [];
  topBooks: any[] = [];
  recentActivities: any[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        this.cd.detectChanges(); // 3. تحديث الواجهة فوراً
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.loading = false;
        this.cd.detectChanges(); // وتحديث الواجهة في حالة الخطأ أيضاً
      }
    });

    this.loadRevenueChart();
    this.loadTopBooks();
    this.loadRecentActivities();
  }

  loadRevenueChart(): void {
    this.dashboardService.getMonthlyRevenue().subscribe({
      next: (data) => {
        this.revenueChartData = data;
        this.cd.detectChanges(); // تحديث عند وصول بيانات المخطط
      }
    });
  }

  loadTopBooks(): void {
    this.dashboardService.getTopBooks(5).subscribe({
      next: (books) => {
        this.topBooks = books;
        this.cd.detectChanges(); // تحديث عند وصول الكتب
      }
    });
  }

  loadRecentActivities(): void {
    this.dashboardService.getRecentActivities(10).subscribe({
      next: (activities) => {
        this.recentActivities = activities;
        this.cd.detectChanges(); // تحديث عند وصول النشاطات
      }
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
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
}
