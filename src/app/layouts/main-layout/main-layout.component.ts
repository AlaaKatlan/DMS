// src/app/layouts/main-layout/main-layout.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: number;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  sidebarOpen = true;
  unreadCount = 0;
  showNotifications = false;
  showUserMenu = false;

  menuItems: MenuItem[] = [
    {
      label: 'لوحة التحكم',
      icon: 'layout-dashboard',
      route: '/dashboard'
    },
    {
      label: 'العملاء',
      icon: 'users',
      route: '/customers'
    },
    {
      label: 'خدمات خارجية',
      icon: 'briefcase',
      route: '/suppliers'
    },
    {
      label: 'الكتب',
      icon: 'book-open',
      route: '/books'
    },
    {
      label: 'المشاريع',
      icon: 'folder',
      route: '/projects'
    },
    {
      label: 'المهام',
      icon: 'check-square',
      route: '/tasks'
    },
    {
      label: 'الفواتير',
      icon: 'file-text',
      route: '/invoices'
    },
    {
      label: 'المحاسبة',
      icon: 'dollar-sign',
      route: '/accounting',
      roles: ['admin', 'accountant']
    },
    {
      label: 'التقويم',
      icon: 'calendar',
      route: '/calendar'
    },
    {
      label: 'الإعدادات',
      icon: 'settings',
      route: '/settings',
      roles: ['admin', 'manager']
    }
  ];

  ngOnInit(): void {
    // Subscribe to notifications count
    this.notificationsService.unreadCount.subscribe(count => {
      this.unreadCount = count;
    });

    // Load user notifications
    if (this.currentUser) {
      this.notificationsService.getUserNotifications(this.currentUser.id).subscribe();
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  hasRole(roles?: string[]): boolean {
    if (!roles || roles.length === 0) return true;
    return this.authService.hasRole(roles);
  }

  logout(): void {
    this.authService.signOut().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
