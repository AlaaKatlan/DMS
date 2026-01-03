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

  showModal = false;
  isEditMode = false;
  currentUserForm: Partial<UserManagementItem> = {};

  roles = [
    { value: 'admin', label: 'مدير النظام (Admin)' },
    { value: 'manager', label: 'مدير مشاريع (Manager)' },
    { value: 'accountant', label: 'محاسب (Accountant)' },
    { value: 'employee', label: 'موظف (Employee)' },
    { value: 'freelancer', label: 'مستقل (Freelancer)' },
    { value: 'client', label: 'عميل (Client)' }
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
        console.error(err);
        this.loading = false;
      }
    });
  }

  openEditModal(user: UserManagementItem): void {
    this.isEditMode = true;
    this.currentUserForm = { ...user };
    this.showModal = true;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentUserForm = { role: 'employee' };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveUser(): void {
    if (this.isEditMode && this.currentUserForm.id) {
      this.settingsService.updateUserFull(this.currentUserForm.id, this.currentUserForm).subscribe({
        next: () => {
          alert('تم تحديث البيانات بنجاح');
          this.loadUsers();
          this.closeModal();
        },
        error: () => alert('فشل التحديث. تأكد من صلاحياتك.')
      });
    } else {
      this.closeModal();
      // هنا يمكن إضافة كود لإنشاء مستخدم عبر Supabase Edge Function مستقبلاً
    }
  }

  deleteUser(user: UserManagementItem): void {
    if (!confirm(`هل أنت متأكد تماماً من حذف المستخدم ${user.full_name}؟ هذا الإجراء قد لا يمكن التراجع عنه.`)) return;

    this.settingsService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        alert('تم الحذف بنجاح');
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء الحذف. قد يكون المستخدم مرتبطاً ببيانات أخرى.');
      }
    });
  }

  getRoleLabel(roleValue: string): string {
    return this.roles.find(r => r.value === roleValue)?.label || roleValue;
  }
}
