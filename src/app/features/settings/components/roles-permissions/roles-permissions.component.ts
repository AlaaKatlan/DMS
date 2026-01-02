import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss']
})
export class RolesPermissionsComponent {

  roles = [
    { key: 'admin', label: 'Admin' },
    { key: 'manager', label: 'Manager' },
    { key: 'accountant', label: 'Accountant' },
    { key: 'employee', label: 'Employee' }
  ];

  // تعريف مصفوفة الصلاحيات (ثابتة للعرض)
  permissions = [
    {
      module: 'المشاريع',
      actions: [
        { name: 'عرض المشاريع', roles: ['admin', 'manager', 'accountant', 'employee'] },
        { name: 'إنشاء/تعديل', roles: ['admin', 'manager'] },
        { name: 'حذف مشروع', roles: ['admin'] }
      ]
    },
    {
      module: 'المالية',
      actions: [
        { name: 'عرض الفواتير', roles: ['admin', 'manager', 'accountant'] },
        { name: 'إنشاء فواتير', roles: ['admin', 'accountant'] },
        { name: 'تسجيل مصاريف', roles: ['admin', 'manager', 'accountant', 'employee'] },
        { name: 'تقارير الأرباح', roles: ['admin', 'accountant'] }
      ]
    },
    {
      module: 'الإعدادات',
      actions: [
        { name: 'إدارة المستخدمين', roles: ['admin'] },
        { name: 'إعدادات النظام', roles: ['admin'] }
      ]
    }
  ];

  hasPermission(roleKey: string, allowedRoles: string[]): boolean {
    return allowedRoles.includes(roleKey);
  }
}
