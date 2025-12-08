// src/app/features/settings/components/users/users.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService, UserManagementItem } from '../../settings.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private settingsService = inject(SettingsService);

  users: UserManagementItem[] = [];
  loading = true;
  error: string | null = null;

  // قائمة الصلاحيات المتاحة
  availableRoles = [
    { value: 'admin', label: 'مدير نظام' },
    { value: 'manager', label: 'مدير' },
    { value: 'accountant', label: 'محاسب' },
    { value: 'employee', label: 'موظف' },
    { value: 'freelancer', label: 'مستقل' }
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.settingsService.getUsersList().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error = 'حدث خطأ أثناء تحميل المستخدمين. تأكد من صلاحياتك.';
        this.loading = false;
      }
    });
  }

  onRoleChange(user: UserManagementItem, newRole: string): void {
    if (!confirm(`هل أنت متأكد من تغيير صلاحية ${user.full_name} إلى ${newRole}؟`)) {
      // إعادة القيمة السابقة إذا ألغى المستخدم (يمكن تحسينها بإعادة تحميل القائمة)
      this.loadUsers();
      return;
    }

    this.settingsService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        alert('تم تحديث الصلاحية بنجاح');
        user.role = newRole; // تحديث محلي
      },
      error: (err) => {
        console.error(err);
        alert('فشل التحديث');
      }
    });
  }
}
