import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, SystemConfig } from '../../settings.service';
import { LucideAngularModule } from 'lucide-angular'; // استيراد الموديول فقط

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule // <--- هذا ضروري لتعريف العنصر في HTML
  ],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);

  config: SystemConfig = {
    company_name: '',
    currency: 'USD'
  };

  saving = false;

  ngOnInit() {
    this.settingsService.getSystemSettings().subscribe({
      next: (data) => {
        if (data) this.config = data;
      },
      error: (err) => console.error(err)
    });
  }

  saveSettings() {
    this.saving = true;
    this.settingsService.saveSystemSettings(this.config).subscribe({
      next: () => {
        alert('تم حفظ إعدادات النظام');
        this.saving = false;
      },
      error: () => {
        alert('حدث خطأ أثناء الحفظ');
        this.saving = false;
      }
    });
  }
}
