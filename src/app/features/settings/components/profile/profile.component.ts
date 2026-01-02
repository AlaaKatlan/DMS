import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SettingsService, UserManagementItem } from '../../settings.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private authService = inject(AuthService);

  user: UserManagementItem | null = null;
  loading = false;
  saving = false;

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    // ✅ تصحيح: استخدام الخاصية مباشرة بدون أقواس ()
    const currentUser = this.authService.currentUser;

    if (!currentUser) return;

    this.loading = true;
    this.settingsService.getProfile(currentUser.id).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  saveChanges(): void {
    if (!this.user) return;
    this.saving = true;

    const updates = {
      full_name: this.user.full_name,
      phone: this.user.phone
    };

    this.settingsService.updateProfile(this.user.id, updates).subscribe({
      next: () => {
        alert('تم تحديث الملف الشخصي بنجاح');
        this.saving = false;
      },
      error: (err) => {
        console.error(err);
        alert('حدث خطأ أثناء الحفظ');
        this.saving = false;
      }
    });
  }
}
