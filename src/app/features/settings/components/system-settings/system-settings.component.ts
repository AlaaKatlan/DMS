import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { SettingsService, SystemConfig } from '../../settings.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);

  config: SystemConfig = {
    companyName: '',
    currency: 'USD',
    taxRate: 0
  };

  saving = false;

  currencies = ['USD', 'AED', 'SAR', 'SYP', 'EUR'];

  ngOnInit(): void {
    this.settingsService.getSystemSettings().subscribe(data => {
      this.config = data;
    });
  }

  saveSettings(): void {
    this.saving = true;
    this.settingsService.saveSystemSettings(this.config).subscribe({
      next: () => {
        alert('تم حفظ إعدادات النظام');
        this.saving = false;
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
