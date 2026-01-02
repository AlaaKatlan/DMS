import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SettingsService, UserManagementItem } from '../../settings.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private settingsService = inject(SettingsService);

  users: UserManagementItem[] = [];
  loading = false;

  // قائمة الأدوار المتاحة في النظام
  roles = [
    { value: 'admin', label: 'مدير النظام' },
    { value: 'manager', label: 'مدير مشاريع' },
    { value: 'accountant', label: 'محاسب' },
    { value: 'employee', label: 'موظف' },
    { value: 'freelancer', label: 'مستقل' },
    { value: 'client', label: 'عميل' }
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
        this.loading = false;
      }
    });
  }

  updateRole(user: UserManagementItem, newRole: string): void {
    if (!confirm(`هل أنت متأكد من تغيير صلاحية ${user.full_name}؟`)) {
      // إعادة القيمة السابقة في حال الإلغاء (يحتاج منطق إضافي أو إعادة تحميل)
      this.loadUsers();
      return;
    }

    this.settingsService.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        alert('تم تحديث الصلاحية بنجاح');
      },
      error: () => {
        alert('حدث خطأ أثناء التحديث');
      }
    });
  }

  deleteUser(user: UserManagementItem): void {
    if (!confirm(`تحذير: هل أنت متأكد من حذف المستخدم ${user.full_name} نهائياً؟`)) return;

    // ملاحظة: تأكد من وجود دالة deleteUser في السيرفس (أضفناها سابقاً)
    this.settingsService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        alert('تم حذف المستخدم');
      },
      error: () => alert('لا يمكن حذف المستخدم، قد يكون مرتبطاً ببيانات أخرى.')
    });
  }

  getRoleLabel(roleValue: string): string {
    return this.roles.find(r => r.value === roleValue)?.label || roleValue;
  }
}
